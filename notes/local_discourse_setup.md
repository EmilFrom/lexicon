# How to Clone Production Discourse to Localhost

**Do NOT copy the `/var/discourse` folder directly.**
That folder contains Linux binaries and configurations specific to your VPS (IP addresses, SSL certs, etc.). It won't work on your Mac.

## The Best Way: Backup & Restore

### 1. Create a Backup on Production
1.  Go to your live site: `discourse.taenketanken.org/admin/backups`.
2.  Click **Backup**.
3.  Wait for it to finish, then **Download** the `.tar.gz` file to your Mac.
    *   *Note: If you have S3 uploads enabled, make sure to include uploads in the backup.*

### 2. Install Discourse Locally (Docker)
On your Mac, you need a fresh Discourse installation.
1.  **Install Docker Desktop** for Mac if you haven't already.
2.  **Clone the Discourse Docker repo**:
    ```bash
    git clone https://github.com/discourse/discourse_docker.git ~/discourse_docker
    cd ~/discourse_docker
    ```
3.  **Run the Setup**:
    Discourse provides a script for local development, but for a "clone" it's often easier to run a standalone container or use the development install guide.
    
    **Recommended for Devs (Easier to hack on plugins):**
    Follow the [MacOS Development Install Guide](https://meta.discourse.org/t/install-discourse-on-macos-for-development/15975).
    *   This sets up Ruby, Postgres, and Redis directly on your Mac (no Docker for the app itself, just services).
    *   This is **much faster** for reloading plugin changes.

    **Alternative (Docker - closer to prod):**
    Use the `discourse/discourse:stable` image, but it's harder to edit files inside.

### 3. Restore the Backup
Once your local Discourse is running (usually `localhost:3000` or `localhost:4200`):
1.  Go to `http://localhost:3000/admin/backups`.
    *   *You might need to create an admin account first during setup.*
2.  **Enable Restore**: You might need to enable the `allow_restore` site setting via the Rails console if the UI blocks it.
    ```bash
    # In your local terminal (if using dev install)
    bundle exec rails c
    SiteSetting.allow_restore = true
    exit
    ```
3.  **Upload** your `.tar.gz` backup file.
4.  Click **Restore**.

### 4. Link Your Plugin
1.  In your local `discourse` folder (from the dev install), find the `plugins` directory.
2.  **Symlink** your local plugin folder:
    ```bash
    ln -s /Users/emil/Documents/Taenketanken/discourse/discourse-lexicon-plugin plugins/discourse-lexicon-plugin
    ```
3.  Restart the local server: `bundle exec rails s`.

Now you have a perfect copy of production with your local plugin code attached! 🚀
