/**
 * The bare minimum Response object type needed for rest-vir to function.
 *
 * This type is used to maximize flexibility between different server providers (like express or
 * hyper-express).
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export type MinimalResponse = {
    /** Sets the HTTP status code and finalizes / sends the response at the same time without a body. */
    sendStatus(code: number): unknown;
    /** Sets an HTTP header. */
    setHeader: (name: string, value: string | string[]) => unknown;
    /** Removes an HTTP header. */
    removeHeader(headerName: string): unknown;
    /** Sets the response's HTTP status. */
    status(code: number): MinimalResponse;
    /** Sends the response with an optional body. */
    send(body?: any): unknown;
    /** Sets multiple response HTTP headers. */
    setHeaders(headers: Headers | Map<string, number | string | readonly string[]>): unknown;
    /** If `true`, headers have already been sent and the response should not be sent again. */
    headersSent: boolean;
};
