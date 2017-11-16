/**
 * Copyright 2017 Hendrik 'T4cC0re' Meyer
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const stackman = require('stackman')();

type libErrorFunc = (err: Error, message?: string, kill?: boolean) => void;
type formatFunc = (err: Error, message?: string) => Promise<string>;

declare module NodeJS {
  interface Global {
    logError: libErrorFunc
    formatError: formatFunc
  }
}

declare const logError: libErrorFunc;
declare const formatError: formatFunc;

global.logError = (err: Error, message?: string, kill?: boolean): void => {
  global.formatError(err, message)
    .then((formattedError: string): void => {
        console.error(formattedError);

        if (kill === true) {
          process.exit(1);
        }
      },
    );
};

const formatUnparsedError = (err: Error, message?: string) => {
  return `ERROR --- ${(new Date()).toUTCString()
    }\n${message ? message + ' ' : ''}[${err && err.name || 'Error'}] ${err && err.message || ''
  }\nfailed to parse. Stack:\n${
  err && err.stack || JSON.stringify(err)
    }\n----------------------------------------------`;
};

global.formatError = (err: Error, message?: string): Promise<string> => {
  return new Promise<string>((resolve) => {
    try {
      stackman.callsites(err, function (_err: Error, callsites: any[]) {
        if (_err) {
          return resolve(formatUnparsedError(err, message));
        }

        const buffer: string[] = [];
        for (let i = 0; i < callsites.length; i++) {
          const callsite = callsites[i];
          let flags = `${callsite.isApp() ? 'A' : '.'}${callsite.isToplevel() ? 'G' : '.'}${callsite.isModule() ? 'M' : '.'}${callsite.isNode() ? 'C' : '.'}${callsite.isNative() ? 'N' : '.'}${callsite.isEval() ? 'E' : '.'}${callsite.isConstructor() ? 'S' : '.'}`;

          let prefix = `${flags}\t[${i}] ->`;
          if (i == 0) {
            prefix = `[${err.name}] ${err.message}\noccurred in\n${flags}\t[${i}] ->`;
            if (message) {
              prefix = message + ' ' + prefix;
            }
          }

          let line: string = '';
          if (callsite.isNode()) {
            line = '<node core>/';
          }
          line += `${callsite.getRelativeFileName()}:${callsite.getLineNumber()} (`;
          if (callsite.getTypeName()) {
            line += `${callsite.getTypeName()}::`;
          }
          line += `${callsite.getFunctionNameSanitized()})`;

          buffer.push(`${prefix} ${line}`);
        }
        const trace = `ERROR --- ${(new Date()).toUTCString()
          }\n${buffer.join('\n')
          }\n----------------------------------------------`;

        return resolve(trace);
      });
    } catch (e) {
      return resolve(formatUnparsedError(err, message));
    }
  });
};

process.on('unhandledRejection', (reason: Error) => {
  logError(reason, 'unhandledRejection:', true);
}).on('uncaughtException', (err: Error) => {
  logError(err, 'uncaughtException:', true);
}).on('warning', (warning: Error) => {
  console.warn(warning.name);    // Print the warning name
  console.warn(warning.message); // Print the warning message
  console.warn(warning.stack);   // Print the stack trace
});
