import { LOCALE } from '../../consts';
import type { Category } from '../../types/domain';
import { categoryDto } from '../../types/strapi';
import { toCategory } from '../mappers/taxonomy';
import { strapi } from './client';

export async function getCategories(locale = LOCALE): Promise<Category[]> {
	const dtos = await strapi.getAll(
		'/api/categories',
		{ locale, fields: ['name', 'slug', 'description'], sort: ['name:asc'] },
		categoryDto,
	);
	return dtos.map(toCategory);
}
