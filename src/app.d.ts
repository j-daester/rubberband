// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}
}


export { };

declare module 'svelte-i18n' {
	// eslint-disable-next-line @typescript-eslint/no-empty-interface
	export interface MessageObject {
		[key: string]: any;
	}
}
