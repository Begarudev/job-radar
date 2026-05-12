import { env } from "../shared/env.ts";
import { loggers } from "../shared/logger.ts";

// Hashnode GraphQL — Personal Access Token + Publication ID required.
// https://apidocs.hashnode.com — publishPost mutation.

const ENDPOINT = "https://gql.hashnode.com";

type Resp = {
  data?: { publishPost?: { post?: { id: string; slug: string; url: string } } };
  errors?: Array<{ message: string }>;
};

export async function publishToHashnode(opts: {
  title: string;
  body: string;
  tags: string[];
  canonicalUrl: string;
  subtitle?: string;
}): Promise<{ url: string } | null> {
  if (!env.hashnodeToken || !env.hashnodePublicationId) {
    loggers.feed.debug("hashnode skipped (missing token or publication id)");
    return null;
  }

  // Hashnode tags: max 5, by name with slug.
  const tags = opts.tags.slice(0, 5).map((t) => ({
    name: t,
    slug: t.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  }));

  const mutation = `
    mutation Publish($input: PublishPostInput!) {
      publishPost(input: $input) {
        post { id slug url }
      }
    }`;
  const variables = {
    input: {
      title: opts.title,
      subtitle: opts.subtitle ?? "",
      contentMarkdown: opts.body,
      tags,
      publicationId: env.hashnodePublicationId,
      originalArticleURL: opts.canonicalUrl,
    },
  };
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: env.hashnodeToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: mutation, variables }),
  });
  const json = (await res.json()) as Resp;
  if (!res.ok || json.errors) {
    loggers.feed.warn(`hashnode error: ${JSON.stringify(json.errors ?? res.status)}`);
    return null;
  }
  const url = json.data?.publishPost?.post?.url;
  if (!url) {
    loggers.feed.warn("hashnode: no url in response");
    return null;
  }
  loggers.feed.success(`hashnode: ${url}`);
  return { url };
}
