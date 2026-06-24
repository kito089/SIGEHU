try {
    Invoke-WebRequest `
        -Uri "https://www.google.com" `
        -UseBasicParsing `
        -TimeoutSec 10 | Out-Null

    exit 0
}
catch {
    exit 1
}