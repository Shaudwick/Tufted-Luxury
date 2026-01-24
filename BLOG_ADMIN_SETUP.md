# Blog Admin Setup Guide

## Quick Start

Your blog management system is now set up! Here's how to use it:

### 1. Set Admin Password

Add this to your `.env` file:
```
BLOG_ADMIN_PASSWORD=your-secure-password-here
```

**Important:** Choose a strong password! This is your only authentication for the admin panel.

### 2. Start Your Server

```bash
node server.js
```

### 3. Access Admin Panel

Navigate to: `http://localhost:4242/blog-admin.html`

Or on your live site: `https://yourdomain.com/blog-admin.html`

### 4. Login

Enter your admin password (the one you set in `.env`).

---

## Using the Admin Panel

### Creating a New Blog Post

1. Click **"+ New Post"** button
2. Fill in all the required fields:
   - **Title**: Your blog post title
   - **Category**: Select from dropdown
   - **Excerpt**: Short description (appears on blog index)
   - **Image Path**: Relative path like `Website-Images/Home/example.jpg`
   - **Image Alt Text**: Descriptive text for SEO
   - **Date**: Publication date
   - **Read Time**: Estimated reading time in minutes
   - **URL Slug**: URL-friendly version (auto-generated from title)
   - **Content**: Full blog post content (supports HTML)
   - **Published**: Check to make visible immediately

3. Click **"Save Post"**
4. Your post appears on the website immediately!

### Editing a Post

1. Click **"Edit"** button on any post in the list
2. Modify the fields as needed
3. Click **"Save Post"**
4. Changes are live immediately!

### Deleting a Post

1. Click **"Delete"** button on any post
2. Confirm deletion
3. Post is removed immediately

---

## Image Guidelines

### Using Images from Your Promotional Materials

Your blog posts use images from your `Website-Images/Home/` directory. Here are some great options:

**Available Images:**
- `GodsGallery1.jpg` - Gallery installation
- `GodsLivingRoom1.jpg` - Living room setting
- `GodsLobby1.jpg` - Lobby installation
- `GodsLoft1.jpg` - Loft installation
- `Masterpiece2.jpeg` - Artwork detail
- `Masterpiece4.jpeg` - Artwork detail
- `Masterpiece5.jpeg` - Artwork detail
- `MasterpieceChronicles1.jpeg` - Chronicles collection
- `MasterpieceChronicles2.jpeg` - Chronicles collection
- `arts-after-dark-flyer.png` - Event flyer

### Best Practices

1. **Use unique images** - Don't reuse the same image for multiple posts
2. **Descriptive alt text** - Always include meaningful alt text for SEO
3. **High quality** - Use high-resolution images (at least 1200px wide)
4. **Consistent style** - Match your brand aesthetic (luxury, modern, artistic)

---

## Content Tips

### HTML Content Support

You can use HTML in your blog post content:
- `<p>` for paragraphs
- `<h2>`, `<h3>` for headings
- `<ul>`, `<ol>`, `<li>` for lists
- `<strong>`, `<em>` for emphasis
- `<blockquote>` for quotes
- `<a href="">` for links

### Example HTML Content:

```html
<p>Welcome to the world of luxury tufted rugs.</p>

<h2>The Foundation: Understanding Tufting</h2>

<p>Tufting is more than a craft—it's a form of artistic expression.</p>

<ul>
  <li><strong>Wool:</strong> Natural and durable</li>
  <li><strong>Silk:</strong> Adds elegance</li>
</ul>

<blockquote>
  "Tufting is where art meets function."
</blockquote>
```

---

## URL Slugs

Slugs create the URL for your blog post. For example:
- Slug: `art-of-tufting`
- URL: `blog-post-template.html?slug=art-of-tufting`

**Best Practices:**
- Use lowercase letters
- Use hyphens, not spaces
- Keep it short and descriptive
- Make it SEO-friendly

Examples:
- ✅ `luxury-rug-guide`
- ✅ `chakra-collection-story`
- ❌ `My Awesome Blog Post!!!`
- ❌ `blog post 2024`

---

## Categories

Available categories:
- **Tufting & Craft** - Technical posts, tutorials
- **Art & Design** - Aesthetic discussions, design inspiration
- **Behind the Scenes** - Studio tours, artist features
- **Community & Events** - Event announcements, community stories
- **Tutorials & Tips** - How-to guides, tips

---

## Publishing Workflow

### Draft Mode

Uncheck "Published" to save a post as a draft. Draft posts:
- Are saved in the system
- Don't appear on the public blog
- Can be edited and published later
- Are visible in the admin panel

### Publishing Immediately

Check "Published" to make your post visible immediately on the website. Changes appear instantly - no need to restart the server!

---

## Security

### Important Security Notes:

1. **Keep your password secure** - Never commit `.env` to git
2. **Use HTTPS in production** - Protect your admin panel
3. **Change default password** - Don't use "admin123" in production
4. **Regular backups** - Backup `blog-posts.json` regularly

### Backup Your Blog Posts

Your posts are stored in `blog-posts.json`. To backup:

```bash
cp blog-posts.json blog-posts-backup-$(date +%Y%m%d).json
```

---

## Troubleshooting

### Can't Login

- Check that `BLOG_ADMIN_PASSWORD` is set in `.env`
- Restart your server after changing `.env`
- Clear browser localStorage: Open console, run `localStorage.clear()`

### Posts Not Showing

- Check that "Published" is checked in admin panel
- Verify server is running
- Check browser console for errors
- Verify `blog-posts.json` file exists

### Images Not Loading

- Verify image path is correct (relative to website root)
- Check that image file exists
- Use forward slashes `/` in paths, not backslashes `\`

### Changes Not Appearing

- Hard refresh browser (Ctrl+F5 or Cmd+Shift+R)
- Clear browser cache
- Verify server is running and has latest `blog-posts.json`

---

## File Structure

```
Tufted-Luxury/
├── blog.html                 # Blog index page (public)
├── blog-post-template.html   # Individual post template (public)
├── blog-admin.html           # Admin panel (password protected)
├── blog-posts.json           # Blog posts database
├── server.js                 # Server with blog API endpoints
└── .env                      # Contains BLOG_ADMIN_PASSWORD
```

---

## API Endpoints (for developers)

- `GET /api/blog/posts` - Get all published posts
- `GET /api/blog/post/:slug` - Get single post by slug
- `GET /api/blog/admin/posts` - Get all posts (including drafts) - requires auth
- `POST /api/blog/post` - Create new post - requires auth
- `PUT /api/blog/post/:id` - Update post - requires auth
- `DELETE /api/blog/post/:id` - Delete post - requires auth

All authenticated endpoints require:
```
Authorization: Bearer your-admin-password
```

---

## Need Help?

- Check server console for error messages
- Verify all files are in correct locations
- Ensure Node.js server is running
- Check browser developer console for frontend errors

---

**You're all set! Start creating amazing blog content for Black Lobby Collective!** 🎨

