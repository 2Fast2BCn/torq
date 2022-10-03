package torqsrv

import (
	"fmt"
	"github.com/rs/zerolog/log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/contrib/gzip"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/jmoiron/sqlx"
	"github.com/lncapital/torq/internal/auth"
	"github.com/lncapital/torq/internal/channel_history"
	"github.com/lncapital/torq/internal/channels"
	"github.com/lncapital/torq/internal/flow"
	"github.com/lncapital/torq/internal/forwards"
	"github.com/lncapital/torq/internal/invoices"
	"github.com/lncapital/torq/internal/messages"
	"github.com/lncapital/torq/internal/on_chain_tx"
	"github.com/lncapital/torq/internal/payments"
	"github.com/lncapital/torq/internal/settings"
	"github.com/lncapital/torq/internal/summary"
	"github.com/lncapital/torq/internal/views"
	"github.com/ulule/limiter/v3"
	mgin "github.com/ulule/limiter/v3/drivers/middleware/gin"
	"github.com/ulule/limiter/v3/drivers/store/memory"
)

func Start(port int, apiPswd string, db *sqlx.DB, restartLNDSub func() error) {
	r := gin.Default()

	auth.CreateSession(r, apiPswd)

	registerRoutes(r, db, apiPswd, restartLNDSub)

	fmt.Println("Listening on port " + strconv.Itoa(port))

	r.Run(":" + strconv.Itoa(port))
}

func applyCors(r *gin.Engine) {
	corsConfig := cors.DefaultConfig()
	//hot reload CORS
	corsConfig.AllowOrigins = []string{"http://localhost:3000"}
	corsConfig.AllowCredentials = true
	r.Use(cors.New(corsConfig))
}

// loginKeyGetter is used to force the Login rate
// limiter to limit all requests regardless of IP etc.
func loginKeyGetter(c *gin.Context) string {
	return "login_limiter"
}

// NewLoginRateLimitMiddleware is used to limit login attempts
func NewLoginRateLimitMiddleware() gin.HandlerFunc {
	// Define a limit rate to 10 requests per minute.
	rate, err := limiter.NewRateFromFormatted("10-M")
	if err != nil {
		log.Fatal().Err(err).Send()
	}
	store := memory.NewStore()
	return mgin.NewMiddleware(limiter.New(store, rate), mgin.WithKeyGetter(loginKeyGetter))
}

var wsUpgrade = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	//check origin will check the cross region source
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		return origin == "http://localhost:3000"
	},
}

func registerRoutes(r *gin.Engine, db *sqlx.DB, apiPwd string, restartLNDSub func() error) {
	r.Use(gzip.Gzip(gzip.DefaultCompression))
	applyCors(r)
	// Websocket
	ws := r.Group("/ws")
	ws.Use(auth.AuthRequired)
	ws.GET("", func(c *gin.Context) {
		WebsocketHandler(c, db)
	})

	registerStaticRoutes(r)

	api := r.Group("/api")

	api.POST("/logout", auth.Logout)

	// Limit login attempts to 10 per minute.
	rl := NewLoginRateLimitMiddleware()
	api.POST("/login", rl, auth.Login(apiPwd))

	unauthorisedSettingRoutes := api.Group("settings")
	{
		settings.RegisterUnauthenticatedRoutes(unauthorisedSettingRoutes, db)
	}

	api.Use(auth.AuthRequired)
	{

		tableViewRoutes := api.Group("/table-views")
		{
			views.RegisterTableViewRoutes(tableViewRoutes, db)
		}

		//channelTagRoutes := api.Group("/tags")
		//{
		//	tags.RegisterTagRoutes(channelTagRoutes, db)
		//}

		paymentRoutes := api.Group("/payments")
		{
			payments.RegisterPaymentsRoutes(paymentRoutes, db)
		}

		invoiceRoutes := api.Group("/invoices")
		{
			invoices.RegisterInvoicesRoutes(invoiceRoutes, db)
		}

		onChainTx := api.Group("/on-chain-tx")
		{
			on_chain_tx.RegisterOnChainTxsRoutes(onChainTx, db)
		}

		channelRoutes := api.Group("/channels")
		{
			channel_history.RegisterChannelHistoryRoutes(channelRoutes, db)
			channels.RegisterChannelRoutes(channelRoutes, db)
		}

		forwardRoutes := api.Group("/forwards")
		{
			forwards.RegisterForwardsRoutes(forwardRoutes, db)
		}

		flowRoutes := api.Group("/flow")
		{
			flow.RegisterFlowRoutes(flowRoutes, db)
		}

		summaryRoutes := api.Group("/summary")
		{
			summary.RegisterSummaryRoutes(summaryRoutes, db)
		}

		messageRoutes := api.Group("messages")
		{
			messages.RegisterMessagesRoutes(messageRoutes, db)
		}

		settingRoutes := api.Group("settings")
		{
			settings.RegisterSettingRoutes(settingRoutes, db, restartLNDSub)
		}

		api.GET("/ping", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"message": "pong",
			})
		})
	}

}

func registerStaticRoutes(r *gin.Engine) {
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		knownAssetList := []string{
			"/favicon.ico",
			"/favicon-16x16.png",
			"/favicon-32x32.png",
			"/mstile-150x150.png",
			"/safari-pinned-tab.svg",
			"/android-chrome-192x192.png",
			"/android-chrome-512x512.png",
			"/apple-touch-icon.png",
			"/browserconfig.xml",
			"/manifest.json",
			"/robots.txt"}

		for _, knownAsset := range knownAssetList {
			if strings.HasSuffix(path, knownAsset) {
				c.File("./web/build" + knownAsset)
				return
			}
		}

		// probably a file, this might not be bulletproof
		if strings.Contains(path, "/static/") && strings.Contains(path, ".") &&
			(strings.Contains(path, "css") || strings.Contains(path, "js") || strings.Contains(path, "media")) {
			parts := strings.Split(path, "/")
			c.File("./web/build/static/" + parts[len(parts)-2] + "/" + parts[len(parts)-1])
			return
		}

		// locales json files
		if strings.Contains(path, "/locales/") && strings.Contains(path, ".json") {
			parts := strings.Split(path, "/")
			c.File("./web/build/locales/" + parts[len(parts)-1])
			return
		}

		c.File("./web/build/index.html")
	})
}
