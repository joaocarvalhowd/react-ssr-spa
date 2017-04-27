import P from 'bluebird';
import React from 'react';
import createMemoryHistory from 'history/createMemoryHistory';
import { renderToString } from 'react-dom/server';
import redisClient from '../services/redis_service';
import log from '../services/logger_service';
import { getRoutesWithStore } from '../../react_router/react_router';
import { matchRoutes, renderRoutes } from 'react-router-config';
import configureStore from '../../redux/store/store';
import Root from '../../views/containers/root_container';
import config from '../config';

const env = config.get('env');
const staticUrl = config.get('staticUrl');
const apiUrl = config.get('apiUrl');
const cacheEnabled = config.get('cacheEnabled');
const cacheExpire = 60 * 6; // 6 hours to start
// refactor to use https://github.com/reactjs/react-router/blob/master/docs/guides/ServerRendering.md

// https://github.com/reactjs/react-router-redux/tree/master/examples/server
export default (req, res) => {
  const htmlKey = `${req.url}:__html`;
  const statusKey = `${req.url}:__status`;

  function returnFromApi() {
    const memoryHistory = createMemoryHistory({ initialEntries: [req.url] });
    // Unexpected keys will be ignored.
    const store = configureStore(memoryHistory, {
      config: {
        env,
        staticUrl,
        apiUrl,
        initialPageLoad: true
      }
    });

    const routes = getRoutesWithStore(store);

    const branch = matchRoutes(routes, req.url);

    const promises = branch.map(({ route, match }) => route.loadData
        ? route.loadData(match)
        : P.resolve(null));

    P.all(promises).then(() => {
      let status;
      status = store.getState().status.code;
      // console.log(store.getState());

      const renderedDOM = `<!doctype>${renderToString(
        <Root store={store} history={memoryHistory} />
      )}`;

      // TODO: cache rendered dom in redis
      res.writeHead(status, {
        'Content-Type': 'text/html'
      });

      res.end(renderedDOM);
      if (config.get('cacheEnabled')) {
        redisClient.set(htmlKey, renderedDOM);
        redisClient.set(statusKey, status);
        redisClient.EXPIRE(htmlKey, cacheExpire); // eslint-disable-line new-cap
        redisClient.EXPIRE(statusKey, cacheExpire); // eslint-disable-line new-cap
      }
      return false;
    }).catch((err) => {
      log.error(err);
      res.status(500).json(err);
    });
  }

  if (!config.get('cacheEnabled')) {
    return returnFromApi();
  }

  const redisHtml = redisClient.getAsync(htmlKey);
  const redisStatus = redisClient.getAsync(statusKey);

  return P.all([redisStatus, redisHtml])
    .then(function returnFromCache(cacheResponse) {
      if (!cacheEnabled) {
        throw new Error('Cache disabled.');
      }

      if (!cacheResponse[0] || !cacheResponse[1]) {
        throw new Error('Not in cache');
      }
      res.writeHead(cacheResponse[0], {
        'Content-Type': 'text/html'
      });
      return res.end(cacheResponse[1]);
    }).catch(returnFromApi);
};
