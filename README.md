# ReverseProxy

Configuration example:

`config.json in root directory`

```json
{
  "google.com": [
    {
      "path": "/api",
      "service": "dockerComposeService1",
      "httpPort": 9000
    },
    {
      "path": "*",
      "service": "dockerComposeService2",
      "httpPort": 9001
    }
  ],
  "myanimelist.net": [
    {
      "path": "*",
      "service": "dockerComposeService3",
      "wsPort": 9002
    }
  ]
}
```
