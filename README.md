# D3 X Tableau

###[Get Started with Dashboard Extensions]###(https://tableau.github.io/extensions-api/docs/trex_getstarted.html)

### Files:
1. first-test.trex
The extension manifest file that contains metadata for the extension and is used for registration.
<br> `<source-location>`: Contains the url of the server that hosts the web page you create that interacts with Tableau.
<br> `<url>`: Specifies the scheme (HTTPS, HTTTP), the name of the server, the port (optional) and the path to extension (optional). The url must use HTTPS.
<br>`<source-location>
  <url>http://localhost:8765/Initiative/first-test/index.html</url>
</source-location>`
<br> `<icon>`: If specified, the icon is what appears in the About dialog box. The icon must be a 70x70 pixel PNG file that is Base64 encoded. (I used their example icon)
<br> 2. index.html
<br> 3. quadrant-chart.js
<br> 4. style.css
