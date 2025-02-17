import {
    HttpStatus,
    stringify,
    wrapInTry,
    type ErrorHttpStatusCategories,
    type HttpStatusByCategory,
    type SelectFrom,
} from '@augment-vir/common';
import type {BaseSearchParams} from '@rest-vir/define-service';
import {
    RestVirHandlerError,
    type ImplementedEndpoint,
    type ImplementedWebSocket,
    type ServerRequest,
} from '@rest-vir/implement-service';
import {assertValidShape, type ShapeDefinition} from 'object-shape-tester';
import {parseUrl} from 'url-vir';

/**
 * Handles a request's search params and compares it against the route's required search params
 * shape, if it has any.
 *
 * @category Internal
 * @category Package : @rest-vir/run-service
 * @package [`@rest-vir/run-service`](https://www.npmjs.com/package/@rest-vir/run-service)
 */
export function handleSearchParams({
    request,
    route,
}: Readonly<{
    request: Readonly<Pick<ServerRequest, 'originalUrl'>>;
    route: Readonly<
        SelectFrom<
            ImplementedEndpoint | ImplementedWebSocket,
            {
                searchParamsShape: true;
                service: {
                    logger: true;
                    serviceName: true;
                };
                path: true;
                isEndpoint: true;
                isWebSocket: true;
            }
        >
    >;
}>):
    | {
          body?: string;
          /**
           * If this is set, then the response is sent with this status code and the given body (if
           * any).
           */
          statusCode: HttpStatusByCategory<ErrorHttpStatusCategories>;
      }
    | {data: BaseSearchParams} {
    const searchParams = parseUrl(request.originalUrl).searchParams;
    const shape = route.searchParamsShape as undefined | ShapeDefinition<any, boolean>;

    const validationError: undefined | Error = shape
        ? wrapInTry(() => {
              assertValidShape(searchParams, shape, {allowExtraKeys: true});
              return undefined;
          })
        : undefined;

    if (validationError) {
        route.service.logger.error(
            new RestVirHandlerError(
                route,
                `Search params failed for ${stringify(searchParams)}: ${validationError.message}`,
            ),
        );
        return {
            body: 'Invalid search params.',
            statusCode: HttpStatus.BadRequest,
        };
    }

    return {
        data: searchParams,
    };
}
