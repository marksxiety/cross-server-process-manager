// XPM simulation process (Go): just a log loop.
package main

import (
	"fmt"
	"time"
)

func main() {
	for {
		fmt.Printf("[go-sim] %s tick\n", time.Now().Format(time.RFC3339))
		time.Sleep(2 * time.Second)
	}
}
