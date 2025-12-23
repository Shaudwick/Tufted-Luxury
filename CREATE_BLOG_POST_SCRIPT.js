// Script to help create blog posts programmatically
// Usage: node CREATE_BLOG_POST_SCRIPT.js

const fs = require('fs');
const path = require('path');

const BLOG_POSTS_FILE = path.join(__dirname, 'blog-posts.json');

function readBlogPosts() {
  try {
    const data = fs.readFileSync(BLOG_POSTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading blog posts:', err);
    return [];
  }
}

function writeBlogPosts(posts) {
  try {
    fs.writeFileSync(BLOG_POSTS_FILE, JSON.stringify(posts, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing blog posts:', err);
    return false;
  }
}

function createBlogPost(postData) {
  const posts = readBlogPosts();
  
  // Check if post with same ID already exists
  const existingIndex = posts.findIndex(p => p.id === postData.id);
  
  if (existingIndex !== -1) {
    // Update existing post
    posts[existingIndex] = {
      ...posts[existingIndex],
      ...postData
    };
    console.log(`✅ Updated existing post: ${postData.title}`);
  } else {
    // Add new post at the beginning (newest first)
    posts.unshift(postData);
    console.log(`✅ Created new post: ${postData.title}`);
  }
  
  if (writeBlogPosts(posts)) {
    console.log(`✅ Blog post saved successfully!`);
    console.log(`📝 Post ID: ${postData.id}`);
    console.log(`🔗 URL slug: ${postData.slug}`);
    return true;
  } else {
    console.error('❌ Failed to save blog post');
    return false;
  }
}

// Example usage (uncomment and modify as needed):
/*
const newPost = {
  id: "example-post-slug",
  title: "Example Blog Post Title",
  category: "community",
  categoryLabel: "Community & Events",
  excerpt: "A brief description of the blog post for the excerpt.",
  image: "Website-Images/Home/example.jpg",
  alt: "Alt text for the image",
  date: "2026-01-10",
  readTime: "5",
  slug: "example-post-slug",
  published: true,
  content: "<p>Your HTML content here...</p>"
};

createBlogPost(newPost);
*/

module.exports = { createBlogPost, readBlogPosts, writeBlogPosts };

console.log('Blog post helper script loaded. Use createBlogPost() function to add posts.');

