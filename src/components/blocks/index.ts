/**
 * Dynamic-zone registry keyed by Strapi's `__component` (AGENTS.md 4.3).
 * A new block is one component file plus one line here — nothing else.
 * Every component takes the block object itself as props (AGENTS.md 4.6).
 */
import type { Block } from '../../types/domain';
import Media from './Media.astro';
import Quote from './Quote.astro';
import RichText from './RichText.astro';
import Slider from './Slider.astro';

/** Each key must map to a component accepting exactly that block (AGENTS.md 4.6). */
type BlockComponents = {
	[K in Block['__component']]: (props: Extract<Block, { __component: K }>) => unknown;
};

/** The registry, seen by the renderer as one interchangeable signature. */
export const blockComponent = (block: Block) =>
	blockRegistry[block.__component] as ((props: Block) => unknown) | undefined;

export const blockRegistry = {
	'shared.media': Media,
	'shared.quote': Quote,
	'shared.rich-text': RichText,
	'shared.slider': Slider,
} as const satisfies BlockComponents;
