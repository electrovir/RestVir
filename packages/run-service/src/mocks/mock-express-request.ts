import type {HttpMethod} from '@rest-vir/define-service';
import type {Request} from 'express';
import type {IncomingHttpHeaders} from 'node:http';

export function createMockRequest(init: {
    method: HttpMethod;
    body?: unknown;
    headers?: IncomingHttpHeaders;
}) {
    return init satisfies Partial<Request> as Request;
}
