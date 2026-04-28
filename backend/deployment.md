# Deployment Guide - VPS Setup with Docker & Nginx

NestJS application with WebSocket support deployment guide.

---

## Step 1: Update System and Install Prerequisites

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl git nginx

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install -y docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installations
docker --version
docker compose version
nginx -v
```

---

## Step 2: Clone Repository

```bash
cd ~

# Clone repo (replace with your details)
git clone https://<YOUR_PERSONAL_ACCESS_TOKEN>@github.com/<username>/<repo-name>.git

cd <repo-name>
```

**Example:**
```bash
git clone https://ghp_yourToken123@github.com/user/repo.git
```

---

## Step 3: Start Backend with Docker Compose

```bash
# Start services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

**Test locally:**
```bash
curl http://localhost:8000
```

---

## Step 4: Configure Nginx as Reverse Proxy

### Remove default config
```bash
sudo rm /etc/nginx/sites-enabled/default
```

### Create new config
```bash
sudo nano /etc/nginx/sites-available/api
```

### Paste this configuration:

```nginx
# WebSocket connection upgrade mapping
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name <YOUR_VPS_IP>;  # Replace with your VPS IP or domain

    # Timeouts for WebSockets
    proxy_read_timeout 3600s;
    proxy_connect_timeout 3600s;
    proxy_send_timeout 3600s;

    # Max upload size
    client_max_body_size 100M;

    # Disable buffering for WebSockets
    proxy_buffering off;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        
        # Standard headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        
        # Cache bypass
        proxy_cache_bypass $http_upgrade;
        proxy_no_cache $http_upgrade;
    }

    # Optional: Socket.IO specific path
    location /socket.io/ {
        proxy_pass http://localhost:8000/socket.io/;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        
        proxy_buffering off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

### Enable configuration
```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/api /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
sudo systemctl enable nginx
```

---

## Step 5: Configure Firewall

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Step 6: Test Deployment

```bash
# From VPS
curl http://localhost

# From local machine (replace with your VPS IP)
curl http://<YOUR_VPS_IP>
```

---

## Bonus: SSL Setup with Let's Encrypt

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## Troubleshooting

### Check if backend is listening
```bash
sudo netstat -tulpn | grep 8000
```

### View nginx logs
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### View docker logs
```bash
docker compose logs -f
```

### Check container status
```bash
docker compose ps
```

### Test nginx config
```bash
sudo nginx -t
```

---

## Useful Commands

```bash
# Restart services
docker compose restart

# Stop services
docker compose down

# Update and restart
git pull
docker compose down
docker compose up -d --build

# Restart nginx
sudo systemctl restart nginx

# View real-time logs
docker compose logs -f
```

---

## NestJS WebSocket Gateway Config

Ensure CORS is enabled in your gateway:

```typescript
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
```

---

**Your API should now be accessible at `http://<YOUR_VPS_IP>` with full WebSocket support!**