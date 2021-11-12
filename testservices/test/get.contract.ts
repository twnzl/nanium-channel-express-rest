import { RequestType, Type } from 'nanium/serializers/core';
import { ServiceResponseBase } from '../serviceResponseBase';
import { ServiceRequestBase } from '../serviceRequestBase';

export class Stuff {
	aString: string;

	@Type(Number)
	aNumber: number;

	@Type(Boolean)
	aBoolean: boolean;

	@Type(Date)
	aDate: Date;
}

export class TestGetResponse extends ServiceResponseBase<TestGetResponseBody> {
}

export class TestGetResponseBody {
	output1: string;

	@Type(Number)
	output2: number;

	@Type(Stuff)
	output3?: Stuff;
}

export class TestGetRequestBody {
	input1: string;

	@Type(Number)
	input2?: number;

	@Type(Stuff)
	input3?: Stuff;
}

@RequestType({
	responseType: ServiceResponseBase,
	genericTypes: {
		TRequestBody: TestGetRequestBody,
		TResponseBody: TestGetResponseBody
	},
	scope: 'public'
})
export class TestGetRequest extends ServiceRequestBase<TestGetRequestBody, TestGetResponseBody> {
	static serviceName: string = 'NaniumTest:test/get';
}
