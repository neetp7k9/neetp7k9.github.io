# Pu An Yang’s personal website

A responsive software engineer profile and blog, hosted on GitHub Pages. The site uses GitHub Pages’ built-in Jekyll support: push to `main`, and GitHub publishes the changes.

## Write a blog post

1. Open `/write/` on the website, or click **Write a post** in the footer.
2. Add a title, date, short summary, tags, and your post. The writing page includes a Markdown preview.
3. Choose **Publish with GitHub**. Sign in to your GitHub account if needed.
4. Review the new file, then select **Commit changes** on GitHub. The page does not publish until you commit it.
5. Wait for the Pages build to finish; the post will appear on the blog and home page.

For a longer article, use **Download Markdown**, then upload the downloaded file into the repository’s `_posts` folder. To keep an unpublished article, download it or explicitly enable the device-local draft option. A future date keeps a post hidden, but a site rebuild on or after that date is required to publish it; there is no automatic scheduler.

Only GitHub users with repository write access can publish. The writing page itself does not receive your GitHub password or token. Preview is a convenient subset of Markdown; GitHub Pages provides the final rendering.

## Edit the profile

- `index.html`: introduction and project links.
- `_posts/`: blog posts, named `YYYY-MM-DD-title.md`.
- `styles.css`: site styling.
- `_layouts/`: shared page and article layouts.
- `_config.yml`: site title, description, and URL.

The initial project descriptions refer to existing public repositories. No employment history, degree, or accomplishments have been invented. The welcome article is editable introductory copy.

## Local preview

Use Ruby and Bundler, then run:

```sh
bundle install
bundle exec jekyll serve
```

Open the address printed by Jekyll. The output folder `_site` is generated and excluded from version control.
