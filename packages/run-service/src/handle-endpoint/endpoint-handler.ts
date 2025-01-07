import type {MaybePromise} from '@augment-vir/common';
import {Endpoint} from '@rest-vir/define-service';
import type {ServiceImplementation} from '@rest-vir/implement-service';
import {Request, Response} from 'express';

export type HandledOutput = {handled: boolean};

/** @returns `true` if the response has been sent. */
export type EndpointHandler = (
    request: Readonly<Request>,
    response: Readonly<Response>,
    endpoint: Readonly<Endpoint>,
    serviceImplementation: Readonly<ServiceImplementation>,
) => MaybePromise<HandledOutput>;
