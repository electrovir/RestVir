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
import {assertValidShape} from 'object-shape-tester';
import {parseUrl} from 'url-vir';

export function parseSearchParams({
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
    const shape = route.searchParamsShape;

    const validationError: undefined | Error = shape
        ? wrapInTry(() => {
              assertValidShape(searchParams, shape);
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
