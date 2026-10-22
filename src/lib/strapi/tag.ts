import { LOCALE } from '../../consts';
import type { Tag } from '../../types/domain';
import { tagDto } from '../../types/strapi';
import { toTag } from '../mappers/taxonomy';
import { strapi } from './client';

export async function getTags(locale = LOCALE): Promise<Tag[]> {
	const dtos = await strapi.getAll(
		'/api/tags',
		{ locale, fields: ['name', 'slug'], sort: ['name:asc'] },
		tagDto,
	);
	return dtos.map(toTag);
}
