# ReverseProxy

Configuration example:

`config.json in root directory`

```json
{
	"hosts": {
		"google.com": {
			"https": true,
			"forceHttps": true,
			"redirects": [{
				"path": "/api",
				"service": "dockerComposeService1",
				"port": 9000
			}, {
				"path": "*",
				"service": "dockerComposeService2",
				"port": 9001
			}]
		},
		"myanimelist.net": {
			"https": false,
			"redirects": [{
				"path": "*",
				"service": "dockerComposeService3",
				"port": 9002
			}]
		}
	}
}
```