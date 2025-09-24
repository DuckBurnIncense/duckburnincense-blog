import { defineCollection, z } from "astro:content";
import { licenseConfig } from "@/config";

const postsCollection = defineCollection({
	schema: z.object({
		/** The title of the post. */
		title: z.string(),
		/** The date the post was published. */
		published: z.date(),
		updated: z.date().optional(),
		/** If this post is still a draft, which won't be displayed. */
		draft: z.boolean().optional().default(false),
		/** A short description of the post. Displayed on index page. */
		description: z.string().optional().default(""),
		/**
		 * The cover image path of the post.
		 * 
		 * 1. Start with `http://` or `https://`: Use web image
		 * 
		 * 2. Start with `/`: For image in `public` dir
		 * 
		 * 3. With none of the prefixes: Relative to the markdown file
		 */
		image: z.string().optional().default(""),
		/** The tags of the post. */
		tags: z.array(z.string()).optional().default([]),
		/** The category of the post. */
		category: z.string().optional().nullable().default(""),
		lang: z.string().optional().default(""),
		/** The license of the post. Must defined at `licenseConfig.licenses` */
		license: z.string().optional().default(licenseConfig.defaultLicense),

		/* For internal use */
		prevTitle: z.string().default(""),
		prevSlug: z.string().default(""),
		nextTitle: z.string().default(""),
		nextSlug: z.string().default(""),
	}),
});
const specCollection = defineCollection({
	schema: z.object({}),
});
export const collections = {
	posts: postsCollection,
	spec: specCollection,
};
