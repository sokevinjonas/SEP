import serverless from 'serverless-http';
import { app } from './index.js';

const serverlessHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  // Strip Netlify redirect prefix so Express routes match correctly (/api/*)
  if (event && event.path) {
    if (event.path.startsWith('/.netlify/functions/serverless')) {
      event.path = event.path.replace('/.netlify/functions/serverless', '');
    } else if (event.path.startsWith('/.netlify/functions/api')) {
      event.path = event.path.replace('/.netlify/functions/api', '');
    }
  }
  return serverlessHandler(event, context);
};
