## Required

-   don't use a symbol for `AnyOrigin` because it makes version compatibility terrible
-   make `object-shape-tester` a peer dependency
-   don't accept port and host inputs to start service because the service definition already contains this.

## Not required

-   add more info logging
-   support raw buffers in socket message
-   omit `HttpMethod.Options` from an endpoint init's methods object because it is always allowed anyway
