import {waitUntil} from '@augment-vir/assert';
import {
    DeferredPromise,
    log,
    omitObjectKeys,
    removeColor,
    safeMatch,
    type MaybePromise,
} from '@augment-vir/common';
import {
    interpolationSafeWindowsPath,
    ShellStderrEvent,
    ShellStdoutEvent,
    streamShellCommand,
} from '@augment-vir/node';
import {describe, it} from '@augment-vir/test';
import type {OutgoingHttpHeaders} from 'node:http';
import {join} from 'node:path';
import {buildUrl} from 'url-vir';
import {startServiceMocksDirPath} from '../util/file-paths.mock.js';

export async function condenseResponse(response: Response) {
    const bodyText = await response.text();
    const bodyObject = bodyText
        ? {
              body: bodyText,
          }
        : {};

    return {
        status: response.status,
        ...bodyObject,
        headers: omitObjectKeys(
            Object.fromEntries(response.headers.entries()) as OutgoingHttpHeaders,
            [
                /**
                 * These headers are automatically set by fastify so we don't care about inspecting
                 * them in tests.
                 */
                'connection',
                'content-length',
                'date',
                'keep-alive',
            ],
        ),
    };
}

export type TestFetch = (
    this: void,
    path: string,
    init?: RequestInit | undefined,
) => Promise<Response>;

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
    shellTarget.listen(ShellStderrEvent, (event) => {
        stderr.push(removeColor(String(event.detail)).toLowerCase());
        log.error(String(event.detail));
    });

    const serviceUrl = await serverStarted.promise;

    const params = {
        address: serviceUrl,
        fetchService: ((path, init) => {
            const fetchUrl = buildUrl(serviceUrl, {
                pathname: path,
            }).href;

            return globalThis.fetch(fetchUrl, init);
        }) as TestFetch,
        childProcess: shellTarget.childProcess,
        stdout,
        stderr,
    };

    await waitUntil.isTrue(async () => (await params.fetchService('health')).ok);

    return params;
}

export function describeServiceScript(
    scriptName: string,
    describeCallback: ({
        it,
    }: {
        it: (
            this: void,
            doesThis: string,
            itCallback: (params: Awaited<ReturnType<typeof setupService>>) => MaybePromise<void>,
        ) => void;
    }) => void,
) {
    describe(scriptName, () => {
        const service = setupService(scriptName);

        describeCallback({
            it(doesThis, itCallback) {
                it(doesThis, async () => {
                    await itCallback(await service);
                });
            },
        });

        /**
         * The built-in Node.js test runner runs `it` calls sequentially so this will always be
         * called last.
         */
        it('closes the server', async () => {
            const {childProcess} = await service;
            childProcess.kill();
        });
    });
}
