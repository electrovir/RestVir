import {waitUntil} from '@augment-vir/assert';
import {DeferredPromise, log, removeColor, safeMatch, type MaybePromise} from '@augment-vir/common';
import {
    interpolationSafeWindowsPath,
    ShellStderrEvent,
    ShellStdoutEvent,
    streamShellCommand,
} from '@augment-vir/node';
import {describe, it} from '@augment-vir/test';
import {
    AnyOrigin,
    overwriteWebSocketMethods,
    waitForOpenWebSocket,
    WebSocketLocation,
    type ClientWebSocket,
} from '@rest-vir/define-service';
import {join} from 'node:path';
import {defineShape, unknownShape} from 'object-shape-tester';
import {buildUrl} from 'url-vir';
import {startServiceMocksDirPath} from '../util/file-paths.mock.js';

export type TestFetch = (
    this: void,
    path: string,
    init?: RequestInit | undefined,
) => Promise<Response>;

export type TestConnectSocket = (
    this: void,
    path: string,
    protocols?: string | string[] | undefined,
) => Promise<ClientWebSocket>;

export function getMockScriptCommand(scriptName: string) {
    const testFilePath = join(startServiceMocksDirPath, scriptName + '.script.mock.ts');

    return [
        'tsx',
        interpolationSafeWindowsPath(testFilePath),
    ].join(' ');
}

async function setupService(scriptName: string) {
    const serverStarted = new DeferredPromise<string>();

    const stdout: string[] = [];
    const stderr: string[] = [];

    /**
     * Use `streamShellCommand` instead of `runShellCommand` because the process will not exit and
     * we'll have to kill it ourselves when the test is done.
     */
    const shellTarget = streamShellCommand(getMockScriptCommand(scriptName));
    shellTarget.listen(ShellStdoutEvent, (event) => {
        const output = removeColor(String(event.detail)).toLowerCase();
        const [
            ,
            url,
        ] = safeMatch(output, /started on (http.+)(\n|$)/);

        log.plain(output);
        stdout.push(output);

        if (url) {
            serverStarted.resolve(url);
        }
    });
    /* node:coverage ignore next 4: keep this in case of errors */
    shellTarget.listen(ShellStderrEvent, (event) => {
        stderr.push(removeColor(String(event.detail)).toLowerCase());
        log.error(String(event.detail));
    });

    const serviceUrl = await serverStarted.promise;

    const allWebSockets = [] as WebSocket[];

    const params = {
        address: serviceUrl,
        fetchService: (async (path, init) => {
            const fetchUrl = buildUrl(serviceUrl, {
                pathname: path,
            }).href;

            return await globalThis.fetch(fetchUrl, init);
        }) as TestFetch,
        connectSocket: (async (path, protocols) => {
            const socketUrl = buildUrl(serviceUrl, {
                pathname: path,
                protocol: 'ws',
            }).href;

            const webSocket = new WebSocket(socketUrl, protocols);
            allWebSockets.push(webSocket);

            await waitForOpenWebSocket(webSocket);

            const finalSocket = overwriteWebSocketMethods(
                {
                    /**
                     * Allow any shape because in this testing framework we're not doing anything
                     * specific to one endpoint.
                     */
                    messageFromClientShape: defineShape(unknownShape()),
                    messageFromServerShape: defineShape(unknownShape()),
                    path: '/test',
                    service: {
                        serviceName: 'test',
                        requiredClientOrigin: AnyOrigin,
                        serviceOrigin: '',
                    },
                    customProps: undefined,
                    endpoint: false,
                    socket: true,
                    MessageFromClientType: undefined,
                    MessageFromHostType: undefined,
                },
                webSocket,
                WebSocketLocation.OnHost,
            );

            return finalSocket;
        }) as TestConnectSocket,
        childProcess: shellTarget.childProcess,
        stdout,
        stderr,
        kill(this: void) {
            allWebSockets.forEach((webSocket) => webSocket.close());
            shellTarget.childProcess.kill('SIGTERM');
        },
    };

    await waitUntil.isTrue(async () => (await params.fetchService('health')).ok);

    return params;
}

type InnerIt = {
    (
        this: void,
        doesThis: string,
        itCallback: (params: Awaited<ReturnType<typeof setupService>>) => MaybePromise<void>,
    ): void;
};

export function describeServiceScript(
    scriptName: string,
    describeCallback: ({it}: {it: InnerIt & {only: InnerIt}}) => void,
) {
    describe(scriptName, () => {
        const service = setupService(scriptName);

        const innerIt: InnerIt = (doesThis, itCallback) => {
            it(doesThis, async () => {
                await itCallback(await service);
            });
        };

        describeCallback({
            it: Object.assign(innerIt, {
                /* node:coverage ignore next 6: this is only used when `it.only` is used. */
                only: ((doesThis, itCallback) => {
                    // eslint-disable-next-line sonarjs/no-exclusive-tests
                    it.only(doesThis, async () => {
                        await itCallback(await service);
                    });
                }) satisfies InnerIt,
            }),
        });

        /**
         * The built-in Node.js test runner runs `it` calls sequentially so this will always be
         * called last.
         */
        // eslint-disable-next-line sonarjs/no-exclusive-tests
        it.only('closes the server', async () => {
            const {kill} = await service;
            kill();
        });
    });
}
