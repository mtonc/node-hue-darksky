import dotenv from 'dotenv'
import regeneratorRuntime from 'regenerator-runtime'
import { v3 } from 'node-hue-api'

dotenv.config();

const hue = v3.api;
const discovery = v3.discovery;

let store = {}

const getBridgeIP = async () => {
	const bridge = discovery.nupnpSearch()
	return bridge.ipaddress
}

const getAuthApi = async () => {
	Object.assign(store, {ip: getBridgeIP()})
	const openApi = await hue.createInsecureLocal(store.ip).connect()
	let user = await openApi.users.createUser('node-hue-darksky', 'pop-os')
	return await hue.createLocal(store.ip).connect()
}

Object.assign(store, {authApi: getAuthApi()})