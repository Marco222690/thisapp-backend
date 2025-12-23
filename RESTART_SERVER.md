# Paano i-restart ang Server

## Steps:

1. **Stop ang current server:**
   - Sa terminal/command prompt, press `Ctrl + C`
   - O kaya close ang terminal window

2. **Start ulit ang server:**
   ```bash
   cd backend-sqlite
   node index.js
   ```
   
   O kaya:
   ```bash
   npm start
   ```

3. **Check kung running:**
   - Dapat makita mo: "Server is running on http://0.0.0.0:8080"
   - Dapat makita mo: "Database Viewer: http://localhost:8080/"

4. **Open sa browser:**
   - `http://localhost:8080`
   - O kaya `http://192.168.56.1:8080`

## Troubleshooting:

### Kung "Cannot GET /" pa rin:
1. Make sure na-stop mo ang old server (Ctrl+C)
2. Start ulit: `node index.js`
3. Check kung may error sa terminal
4. Try `http://localhost:8080/api/health` - dapat may response

### Kung hindi pa rin gumagana:
1. Check kung may ibang app na gumagamit ng port 8080
2. Try different port: Change `PORT = 8080` to `PORT = 3000` sa index.js
3. Check firewall settings

