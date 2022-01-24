import * as express from 'express';
import { Nanium } from 'nanium/core';
import { TestServerRequestInterceptor } from './test.request.interceptor';
import { KindOfResponsibility } from 'nanium/interfaces/kindOfResponsibility';
import { NaniumExpressRestChannel } from '../index';
import * as http from 'http';
import { NaniumProviderNodejs } from 'nanium/managers/providers/nodejs';

export class TestHelper {
	static port: number = 8888;
	static hasServerBeenCalled: boolean;
	private static expressApp: any;

	private static async initExpressApp(): Promise<void> {
		this.expressApp = express();
		this.expressApp.listen(this.port);
	}

	static async initClientServerScenario(): Promise<void> {
		await this.initExpressApp();

		// Nanium provider and consumer
		this.hasServerBeenCalled = false;
		await Nanium.addManager(new NaniumProviderNodejs({
			servicePath: 'dist/testservices',
			channels: [
				new NaniumExpressRestChannel({
					apiBasePath: '/api',
					expressApp: this.expressApp,
					executionContextConstructor: Object
				})
			],
			requestInterceptors: [ TestServerRequestInterceptor ],
			isResponsible: async (): Promise<KindOfResponsibility> => Promise.resolve('yes'),
			handleError: async (err: any): Promise<any> => {
				throw err;
			}
		}));
	}

	static async shutdown(): Promise<void> {
		this.expressApp.close();
		await Nanium.shutdown();
	}

	static async send(method: string, uri: string): Promise<any> {
		return await new Promise<any>(resolve => {
			http[method](uri, (res: http.IncomingMessage) => {
				let str: string = '';
				res.on('data', (chunk: string) => {
					str += chunk;
				});
				res.on('end', async () => {
					resolve(str);
				});
			});
		});
	}
}
