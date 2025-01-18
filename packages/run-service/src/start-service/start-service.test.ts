import {assert} from '@augment-vir/assert';
import {DeferredPromise, removeColor, safeMatch} from '@augment-vir/common';
import {
    interpolationSafeWindowsPath,
    ShellStderrEvent,
    ShellStdoutEvent,
    streamShellCommand,
} from '@augment-vir/node';
import {describe, it} from '@augment-vir/test';
import {join} from 'node:path';
import {joinUrlPaths} from 'url-vir';
import {startServiceMocksDirPath} from '../util/file-paths.mock.js';
import {startService} from './start-service.js';

async function runTestCase(fileName: string) {
    const testFilePath = join(startServiceMocksDirPath, fileName + '.script.mock.ts');

    const command = [
        'tsx',
        interpolationSafeWindowsPath(testFilePath),
    ].join(' ');

    const serverStarted = new DeferredPromise<string>();

    const stdout: string[] = [];
    const stderr: string[] = [];

    const shellTarget = streamShellCommand(command);

    shellTarget.listen(ShellStdoutEvent, (event) => {
        const output = removeColor(String(event.detail)).toLowerCase();
        const [
            ,
            url,
        ] = safeMatch(output, /started on (http.+)$/);

        if (url) {
            serverStarted.resolve(url);
        }

        stdout.push(output);
    });
    shellTarget.listen(ShellStderrEvent, (event) => {
        const output = removeColor(String(event.detail)).toLowerCase();

        stderr.push(output);
    });

    const serviceUrl = await serverStarted.promise;

    return {
        stdout,
        stderr,
        childProcess: shellTarget.childProcess,
        url: serviceUrl,
    };
}

async function fetchService(url: string) {
    const response = await fetch(url);

    return await response.json();
}

describe(startService.name, () => {
    it('runs a service on a single thread', async () => {
        const {childProcess, stderr, stdout, url} = await runTestCase('single-thread');

        const result = await fetchService(joinUrlPaths(url, 'test'));

        assert.deepEquals(result, {});

        childProcess.kill();
    });
});
