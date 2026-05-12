#!/bin/bash
HOST="fake-news-detection1.p.rapidapi.com"
KEY="8cf1c3153bmsh73a6cedbcef08d6p1594f3jsnb891e25cf03c"

for path in "/" "/fakedetect" "/predict-news" "/news/predict" "/news/detect" "/news-detection" "/fake_news" "/fakenews" "/article" "/detect-news" "/verify" "/check-news" "/ai/detect" "/api/news" "/health" "/status" "/Detection" "/detection" "/Classify" "/FakeNews" "/fake-news-detection"; do
  code=$(curl -s -o /tmp/r -w "%{http_code}" -X POST "https://$HOST$path" -H "x-rapidapi-host: $HOST" -H "x-rapidapi-key: $KEY" -H "Content-Type: application/json" -d '{"text":"test article"}')
  if [ "$code" != "404" ]; then
    body=$(head -c 300 /tmp/r)
    echo "POST $path -> $code: $body"
  fi
done
echo "---GET tests:"
for path in "/" "/health" "/status" "/openapi.json" "/docs" "/swagger.json" "/apidocs" "/spec"; do
  code=$(curl -s -o /tmp/r -w "%{http_code}" -X GET "https://$HOST$path" -H "x-rapidapi-host: $HOST" -H "x-rapidapi-key: $KEY")
  if [ "$code" != "404" ]; then
    body=$(head -c 300 /tmp/r)
    echo "GET $path -> $code: $body"
  fi
done
echo "---Query param tests"
for path in "/" "/fakedetect" "/news"; do
  code=$(curl -s -o /tmp/r -w "%{http_code}" -X GET "https://$HOST$path?text=test" -H "x-rapidapi-host: $HOST" -H "x-rapidapi-key: $KEY")
  if [ "$code" != "404" ]; then
    body=$(head -c 300 /tmp/r)
    echo "GET $path?text=test -> $code: $body"
  fi
done
