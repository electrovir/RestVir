## Required

-   add typed web sockets
-   add socket implementation
-   make both endpoints and sockets optional
-   add typed search params
-   fill in mono-repo README
-   remove all the auth stuff, that can happen in context
    -   allow context to reject a request (like, change the return type to `{context: Context}|{reject: {status: HttpStatus, statusMessage: string}}`)
    -   allow defining arbitrary properties on endpoints and sockets so that they can define their own auth
        -   if we can't get this to work, we can't remove the auth stuff

## Less required

-   replace `undefined` `requiredAuth` functionality with a new `NoAuth` export, similar to how `AnyOrigin` is used

## Not required

-   omit `HttpMethod.Options` from an endpoint init's methods object because it is always allowed anyway
-   add authentication to web sockets: https://stackoverflow.com/a/77060459

    ```
    5. Smuggle access tokens inside Sec-WebSocket-Protocol

    Since the only header a browser will let you control is Sec-WebSocket-Protocol, you can abuse it to emulate any other header. Interestingly (or rather comically), this is what Kubernetes is doing. In short, you append whatever you need for authentication as an extra supported subprotocol inside Sec-WebSocket-Protocol:

    var ws = new WebSocket("ws://example.com/path", ["realProtocol", "yourAccessTokenOrSimilar"]);

    Then, on the server, you add some sort of middleware that transforms the request back to its saner form before passing it further into the system. Terrible, yes, but so far the best solution. No tokens in the URL, no custom authentication save for the little middleware, no extra state on the server needed. Do not forget to include the real subprotocol, as various tools will reject a connection without one.
    ```
