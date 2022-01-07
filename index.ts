import * as express from 'express';
import { NaniumRepository } from 'nanium/interfaces/serviceRepository';
import { NaniumJsonSerializer } from 'nanium/serializers/json';
import { Nanium } from 'nanium/core';
import { LogMode } from 'nanium/interfaces/logMode';
import { NaniumSerializerCore } from 'nanium/serializers/core';
import { Observable } from 'rxjs';
import { Channel } from 'nanium/interfaces/channel';
import { ChannelConfig } from 'nanium/interfaces/channelConfig';
import { EventSubscription } from 'nanium/interfaces/eventSubscription';

export interface NaniumExpressRestChannelConfig extends ChannelConfig {
	expressApp: express.Express;
	apiBasePath?: string;
	getHttpStatusCode?: (err: any) => number;
}


export class NaniumExpressRestChannel implements Channel {
	private config: NaniumExpressRestChannelConfig;

	constructor(config: NaniumExpressRestChannelConfig) {
		this.config = config;
		this.config.getHttpStatusCode = this.config.getHttpStatusCode || ((): number => {
			return 500;
		});
		if (!config.apiBasePath) {
			config.apiBasePath = '/';
		} else {
			if (!config.apiBasePath.endsWith('/')) {
				config.apiBasePath += '/';
			}
			if (!config.apiBasePath.startsWith('/')) {
				config.apiBasePath = '/' + config.apiBasePath;
			}
		}
		config.serializer = config.serializer ?? new NaniumJsonSerializer();
	}

	eventSubscriptions: { [eventName: string]: EventSubscription<any>[]; };

	async init(serviceRepository: NaniumRepository): Promise<void> {
		for (const key in serviceRepository) {
			if (!serviceRepository.hasOwnProperty(key)) {
				continue;
			}
			const requestConstructor: any = serviceRepository[key].Request;
			if (requestConstructor.scope === 'public') {
				const {
					method,
					path
				}: { method: string; path: string; } = this.getMethodAndPath(requestConstructor.serviceName);
				this.config.expressApp[method](path, async (req: express.Request, res: express.Response) => {
					const serviceRequest: any = await this.createRequest(req, requestConstructor);
					if (req.headers['streamed'] === 'true') {
						if (!serviceRequest.stream) {
							res.statusCode = 500;
							res.write(await this.config.serializer.serialize('the service does not support result streaming'));
						}
						this.stream(requestConstructor.serviceName, serviceRequest, res);
					} else {
						await this.execute(requestConstructor.serviceName, serviceRequest, res);
					}
				});
			}
		}
	}

	getMethodAndPath(serviceName: string): { method: string, path: string } {
		const idx: number = serviceName.indexOf(':');
		const  parts: string[] = (idx >= 0) ? serviceName.substr(idx + 1).split('/') : serviceName.split('/');
		const lastPart: string = parts.pop().toLowerCase();
		let path: string = this.config.apiBasePath + parts.join('/').toLowerCase();
		let method: string;
		switch (lastPart) {
			case 'query':
			case 'get':
				method = 'get';
				break;
			case 'update':
			case 'change':
			case 'store':
			case 'put':
				method = 'put';
				break;
			case 'remove':
			case 'delete':
				method = 'delete';
				break;
			case 'create':
			case 'add':
			case 'post':
				method = 'post';
				break;
			default:
				method = 'post';
				path = path + '/' + lastPart;
		}
		if (Nanium.logMode === LogMode.info) {
			console.log((method + '    ').substr(0, 7) + ':' + path);
		}
		return { method, path };
		// todo: optional it should be possible to pass a configuration to the constructor where is defined which service shall be exposed with which method/path
	}

	private async execute(serviceName: string, serviceRequest: any, res: express.Response): Promise<any> {
		try {
			const result: any = await Nanium.execute(serviceRequest, serviceName, new this.config.executionContextConstructor({ scope: 'public' }));
			if (result !== undefined && result !== null) {
				res.write(await this.config.serializer.serialize(result));
			}
			res.statusCode = 200;
		} catch (e) {
			res.statusCode = this.config.getHttpStatusCode(e);
			res.write(await this.config.serializer.serialize(e));
		}
		res.end();
	}

	private stream(serviceName: string, serviceRequest: any, res: express.Response): void {
		const result: Observable<any> = Nanium.stream(serviceRequest, serviceName, new this.config.executionContextConstructor({ scope: 'public' }));
		res.statusCode = 200;
		result.subscribe({
			next: async (value: any): Promise<void> => {
				res.write(await this.config.serializer.serialize(value) + '\n');
				res['flush']();
			},
			complete: (): void => {
				res.end();
			},
			error: async (e: any): Promise<void> => {
				res.statusCode = this.config.getHttpStatusCode(e);
				res.write(await this.config.serializer.serialize(e));
			}
		});
	}

	async createRequest(req: express.Request, requestConstructor: new () => any): Promise<any> {
		const request: any = { ...req.body };
		for (const property in req.query) {
			if (!req.query.hasOwnProperty(property)) {
				continue;
			}
			const parts: string[] = property.split('.');
			const value: any = req.query[property];
			let prop: string;
			let subObj: any = request;
			while (parts.length) {
				prop = parts.shift();
				if (!parts.length) {
					subObj[prop] = value;
				} else {
					subObj[prop] = subObj[prop] || {};
				}
				subObj = subObj[prop];
			}
		}
		request['$$headers'] = req.headers || {};
		request['$$rawBody'] = req['$$rawBody'];
		request['$$requestSource'] = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
		return NaniumSerializerCore.plainToClass(request, requestConstructor);
	}

	emitEvent(_event: any, _subscription: EventSubscription<any>): Promise<void> {
		throw new Error('Method not implemented.');
	}
}
