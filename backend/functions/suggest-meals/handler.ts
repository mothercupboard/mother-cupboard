import * as Sentry from '@sentry/serverless';

Sentry.AWSLambda.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.STAGE ?? 'development',
  tracesSampleRate: 0.2,
});

export const handler = Sentry.AWSLambda.wrapHandler(async (event: unknown) => {
  // Stub — implemented in Epic 4 Story 4.1
  return {
    statusCode: 501,
    body: JSON.stringify({
      data: null,
      error: { code: 'NOT_IMPLEMENTED', message: 'Not yet implemented', retryable: false },
    }),
  };
});
