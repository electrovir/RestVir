## Required

-   add typed search params
-   clean up the `debug` input: just overwrite the error logger if `debug` is `true`, replace `log.if` logs with calls to the service logger
-   fill in mono-repo README
-   make sure everything is exported
-   add more info logging
-   add a dev port scanner so frontends can find their backend.

## Not required

-   support socket message buffers
-   omit `HttpMethod.Options` from an endpoint init's methods object because it is always allowed anyway
