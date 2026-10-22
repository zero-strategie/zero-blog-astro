import type { ImageRef } from '../../types/domain';
import type { MediaDto } from '../../types/strapi';
import { mediaUrl } from '../url';

export function toImageRef(media: MediaDto | null | undefined): ImageRef | undefined {
	if (!media) return undefined;
	return {
		url: mediaUrl(media.url),
		alt: media.alternativeText ?? '',
		width: media.width ?? undefined,
		height: media.height ?? undefined,
	};
}
