# How to Upload BCLAS.mp4 Video to Production Server

## Method 1: SCP (Secure Copy) - Recommended if you have SSH access

```bash
# Replace with your actual server details:
# - username: your server username
# - server-ip: your server IP or domain
# - /path/to/website: path to your website root on the server

scp Website-Images/BCLAS.mp4 username@server-ip-or-domain:/path/to/website/Website-Images/
```

**Example:**
```bash
scp Website-Images/BCLAS.mp4 user@blacklobby.co:/var/www/html/Website-Images/
# or
scp Website-Images/BCLAS.mp4 user@123.45.67.89:/home/user/website/Website-Images/
```

---

## Method 2: SFTP (FileZilla or similar)

1. **Download FileZilla** (free): https://filezilla-project.org/
2. **Connect to your server:**
   - Host: your server IP or domain
   - Username: your server username
   - Password: your server password
   - Port: 22 (for SFTP)
3. **Navigate to:** `/path/to/your/website/Website-Images/`
4. **Upload:** Drag and drop `BCLAS.mp4` from your local `Website-Images/` folder

---

## Method 3: Hosting Provider File Manager

If you're using a hosting provider (cPanel, Plesk, etc.):

1. **Log into your hosting control panel**
2. **Open File Manager**
3. **Navigate to:** `Website-Images/` folder
4. **Upload** the `BCLAS.mp4` file
   - Note: Some providers have file size limits (check if 261MB is allowed)
   - If too large, you may need to use FTP/SFTP instead

---

## Method 4: Using rsync (if you have SSH access)

```bash
rsync -avz --progress Website-Images/BCLAS.mp4 username@server:/path/to/website/Website-Images/
```

The `--progress` flag shows upload progress for the large file.

---

## Method 5: Git LFS (Git Large File Storage) - Alternative

If you want to store it in Git (requires setup):

```bash
# Install Git LFS
git lfs install

# Track large video files
git lfs track "*.mp4"

# Add and commit
git add .gitattributes
git add Website-Images/BCLAS.mp4
git commit -m "Add event video using Git LFS"
git push origin main
```

**Note:** This requires Git LFS to be set up on both your local machine and your server.

---

## After Uploading

1. **Verify the file is in the correct location:**
   ```bash
   # On your server, check:
   ls -lh /path/to/website/Website-Images/BCLAS.mp4
   # Should show: 261M
   ```

2. **Set correct permissions:**
   ```bash
   chmod 644 /path/to/website/Website-Images/BCLAS.mp4
   ```

3. **Test the video URL:**
   - Visit: `https://www.blacklobby.co/Website-Images/BCLAS.mp4`
   - Should play the video

---

## Troubleshooting

### File too large for hosting provider?
- **Option A:** Compress the video (may reduce quality)
- **Option B:** Use a CDN service (Cloudflare, AWS S3, etc.)
- **Option C:** Host video on YouTube/Vimeo and embed it instead

### Upload is slow?
- Large files (261MB) take time to upload
- Use `--progress` flag with rsync/scp to see progress
- Consider uploading during off-peak hours

### Permission errors?
```bash
# Make sure the file is readable
chmod 644 Website-Images/BCLAS.mp4

# Make sure the directory is accessible
chmod 755 Website-Images/
```

---

## Quick Check: Do you have SSH access?

If you're not sure, try:
```bash
ssh username@your-server-domain
```

If this works, you have SSH access and can use Method 1 or 4.

