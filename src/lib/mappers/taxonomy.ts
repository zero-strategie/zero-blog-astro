import type { Category, Tag } from '../../types/domain';
import type { CategoryDto, TagDto } from '../../types/strapi';

export const toCategory = (dto: CategoryDto): Category => ({
	name: dto.name,
	slug: dto.slug,
	description: dto.description ?? undefined,
});

export const toTag = (dto: TagDto): Tag => ({ name: dto.name, slug: dto.slug });
