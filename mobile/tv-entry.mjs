import {mountTvNavigation} from './tv-navigation.mjs';
await import('./native.mjs');
// The phone callback protocol is intentionally not registered by the TV preview.
globalThis.yataBuddyBridge=async()=>{throw Error('Companion verification is not available in this TV preview. Use YATA on your phone or the web.');};
mountTvNavigation();
