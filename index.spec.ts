import { TestHelper } from './testservices/testHelper';
import { TestGetResponse } from './testservices/test/get.contract';

beforeAll(async () => {
	await TestHelper.initClientServerScenario();
});

afterAll(async () => {
	await TestHelper.shutdown();
});

describe('send an HTTP get to /api/test \n', function (): void {
	let response: any;
		beforeEach(async () => {
			response = await TestHelper.send('get', 'http://localhost:' + TestHelper.port + '/api/test?head.token=1234&body.input1=hello+world&body.input2=42&body.input3.aNumber=9');
		});

		it('--> the service should have been called via the http channel and should return the right result \n', async () => {
			const result: TestGetResponse = JSON.parse(response);
			expect(result.body.output1, 'o1 should be correct').toBe('hello world :-)');
			expect(result.body.output2, 'o2 should be correct').toBe(43);
			expect(result.body.output3.aNumber, 'o2 should be correct').toBe(9);
		});
});
