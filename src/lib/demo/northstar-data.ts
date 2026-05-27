export const NORTHSTAR_ORG = {
  id: "org_northstar_logistics",
  slug: "northstar-logistics",
  name: "Northstar Logistics",
  industry: "Third-party logistics and fulfillment",
  timezone: "America/Chicago",
  metadata: {
    headquarters: "Minneapolis, MN",
    demo: true,
    operatingRegions: ["North America", "EMEA", "APAC"]
  }
} as const;

export const FLAGSHIP_INCIDENT = {
  id: "inc_warehouse_api_latency_2025_02_18",
  slug: "warehouse-api-latency-spike",
  title: "Warehouse API latency spike",
  delayedOrders: 312,
  revenueAtRiskCents: 4_820_000
} as const;

export const DEMO_PERMISSION_DEFINITIONS = [
  ["perm_dashboard_read", "dashboard:read", "Read dashboard", "View operational dashboard metrics.", "dashboard"],
  ["perm_incidents_read", "incidents:read", "Read incidents", "View incidents and timelines.", "incidents"],
  ["perm_incidents_write", "incidents:write", "Manage incidents", "Create and update incidents.", "incidents"],
  ["perm_timeline_write", "timeline:write", "Write timeline", "Add incident timeline events.", "incidents"],
  ["perm_orders_read", "orders:read", "Read orders", "View customer and order impact.", "operations"],
  ["perm_agents_run", "agents:run", "Run agents", "Start AI investigation agents.", "agents"],
  ["perm_agents_read", "agents:read", "Read agents", "View agent runs and recommendations.", "agents"],
  ["perm_approvals_read", "approvals:read", "Read approvals", "View approval queue and decisions.", "governance"],
  ["perm_approvals_decide", "approvals:decide", "Decide approvals", "Approve or reject governed actions.", "governance"],
  ["perm_finance_review", "finance:review", "Finance review", "Review revenue-at-risk and customer credits.", "finance"],
  ["perm_knowledge_read", "knowledge:read", "Read knowledge", "Search runbooks, tickets, docs, and logs.", "knowledge"],
  ["perm_reports_read", "reports:read", "Read reports", "View generated reports.", "reports"],
  ["perm_reports_write", "reports:write", "Write reports", "Generate or publish reports.", "reports"],
  ["perm_audit_read", "audit:read", "Read audit", "View audit log activity.", "governance"],
  ["perm_integrations_manage", "integrations:manage", "Manage integrations", "Configure notification and system integrations.", "admin"],
  ["perm_admin", "admin:all", "Administer workspace", "Full demo administration.", "admin"]
] as const;

export const DEMO_ROLES = [
  {
    id: "role_executive",
    slug: "executive",
    name: "Executive",
    description: "Revenue and customer impact view for leadership decisions.",
    demoPersona: "Maya Chen, Chief Operating Officer",
    permissionSlugs: ["dashboard:read", "incidents:read", "orders:read", "approvals:read", "finance:review", "reports:read", "audit:read"]
  },
  {
    id: "role_ops_manager",
    slug: "ops-manager",
    name: "Ops Manager",
    description: "Owns incident command, customer impact, and coordinated response.",
    demoPersona: "Diego Alvarez, Director of Fulfillment Operations",
    permissionSlugs: [
      "dashboard:read",
      "incidents:read",
      "incidents:write",
      "timeline:write",
      "orders:read",
      "agents:run",
      "agents:read",
      "approvals:read",
      "knowledge:read",
      "reports:read",
      "reports:write"
    ]
  },
  {
    id: "role_engineer",
    slug: "engineer",
    name: "Engineer",
    description: "Investigates service health, runbooks, logs, and remediation plans.",
    demoPersona: "Priya Natarajan, Staff Platform Engineer",
    permissionSlugs: [
      "dashboard:read",
      "incidents:read",
      "incidents:write",
      "timeline:write",
      "agents:run",
      "agents:read",
      "knowledge:read",
      "integrations:manage"
    ]
  },
  {
    id: "role_support_lead",
    slug: "support-lead",
    name: "Support Lead",
    description: "Manages customer communications, support queues, and escalations.",
    demoPersona: "Jordan Ellis, Support Lead",
    permissionSlugs: ["dashboard:read", "incidents:read", "orders:read", "knowledge:read", "reports:read", "timeline:write"]
  },
  {
    id: "role_finance_reviewer",
    slug: "finance-reviewer",
    name: "Finance Reviewer",
    description: "Approves customer credits and revenue-impact decisions.",
    demoPersona: "Leah Brooks, Finance Controller",
    permissionSlugs: ["dashboard:read", "incidents:read", "orders:read", "approvals:read", "approvals:decide", "finance:review", "audit:read"]
  },
  {
    id: "role_admin",
    slug: "admin",
    name: "Admin",
    description: "Full demo workspace administrator.",
    demoPersona: "Alex Morgan, CommandGrid Admin",
    permissionSlugs: DEMO_PERMISSION_DEFINITIONS.map((permission) => permission[1])
  }
] as const;

export const DEMO_USERS = [
  ["user_maya_chen", "maya.chen@northstar.example", "Maya Chen", "Chief Operating Officer", "MC", "executive"],
  ["user_diego_alvarez", "diego.alvarez@northstar.example", "Diego Alvarez", "Director of Fulfillment Operations", "DA", "ops-manager"],
  ["user_priya_natarajan", "priya.natarajan@northstar.example", "Priya Natarajan", "Staff Platform Engineer", "PN", "engineer"],
  ["user_jordan_ellis", "jordan.ellis@northstar.example", "Jordan Ellis", "Support Lead", "JE", "support-lead"],
  ["user_leah_brooks", "leah.brooks@northstar.example", "Leah Brooks", "Finance Controller", "LB", "finance-reviewer"],
  ["user_alex_morgan", "alex.morgan@northstar.example", "Alex Morgan", "CommandGrid Admin", "AM", "admin"]
] as const;

export const SERVICES = [
  ["svc_warehouse_api", "warehouse-api", "Warehouse API", "tier-0", "Platform Engineering", "degraded", 450],
  ["svc_order_router", "order-router", "Order Router", "tier-0", "Fulfillment Systems", "degraded", 600],
  ["svc_inventory_sync", "inventory-sync", "Inventory Sync", "tier-1", "Warehouse Systems", "healthy", 900],
  ["svc_carrier_gateway", "carrier-gateway", "Carrier Gateway", "tier-1", "Transportation", "healthy", 800],
  ["svc_customer_portal", "customer-portal", "Customer Portal", "tier-2", "Digital Experience", "healthy", 1000]
] as const;

export const CUSTOMERS = [
  ["cust_apex_retail", "CUST-1001", "Apex Retail Group", "enterprise", "North America", "platinum"],
  ["cust_bluebird_home", "CUST-1002", "Bluebird Home", "enterprise", "North America", "gold"],
  ["cust_cascade_outdoors", "CUST-1003", "Cascade Outdoors", "mid-market", "North America", "gold"],
  ["cust_evergreen_health", "CUST-1004", "Evergreen Health Supply", "enterprise", "North America", "platinum"],
  ["cust_harbor_electronics", "CUST-1005", "Harbor Electronics", "mid-market", "EMEA", "silver"],
  ["cust_metro_grocery", "CUST-1006", "Metro Grocery Direct", "enterprise", "North America", "platinum"],
  ["cust_pinnacle_sports", "CUST-1007", "Pinnacle Sports", "mid-market", "North America", "gold"],
  ["cust_summit_beauty", "CUST-1008", "Summit Beauty Co.", "growth", "APAC", "silver"]
] as const;

export const ORDERS = [
  ["ord_900145", "cust_apex_retail", "NS-900145", "delayed", 515000, 92, "2025-02-18T16:45:00.000Z"],
  ["ord_900146", "cust_apex_retail", "NS-900146", "delayed", 420000, 88, "2025-02-18T17:10:00.000Z"],
  ["ord_900147", "cust_bluebird_home", "NS-900147", "delayed", 380000, 77, "2025-02-18T17:15:00.000Z"],
  ["ord_900148", "cust_cascade_outdoors", "NS-900148", "delayed", 265000, 64, "2025-02-18T17:30:00.000Z"],
  ["ord_900149", "cust_evergreen_health", "NS-900149", "delayed", 710000, 108, "2025-02-18T17:45:00.000Z"],
  ["ord_900150", "cust_metro_grocery", "NS-900150", "delayed", 640000, 101, "2025-02-18T18:00:00.000Z"],
  ["ord_900151", "cust_pinnacle_sports", "NS-900151", "delayed", 230000, 56, "2025-02-18T18:10:00.000Z"],
  ["ord_900152", "cust_harbor_electronics", "NS-900152", "at-risk", 360000, 40, "2025-02-18T18:20:00.000Z"],
  ["ord_900153", "cust_summit_beauty", "NS-900153", "at-risk", 300000, 36, "2025-02-18T18:25:00.000Z"],
  ["ord_900154", "cust_metro_grocery", "NS-900154", "at-risk", 1000000, 44, "2025-02-18T18:35:00.000Z"],
  ["ord_900155", "cust_evergreen_health", "NS-900155", "processing", 180000, 0, "2025-02-18T19:00:00.000Z"],
  ["ord_900156", "cust_bluebird_home", "NS-900156", "processing", 220000, 0, "2025-02-18T19:15:00.000Z"]
] as const;

export const HISTORICAL_INCIDENTS = [
  ["inc_carrier_webhook_retries_2025_01_30", "carrier-webhook-retries", "Carrier webhook retry storm", "resolved", "sev2", "2025-01-30T13:15:00.000Z", "2025-01-30T13:19:00.000Z", "2025-01-30T14:02:00.000Z", 84, 1260000],
  ["inc_inventory_drift_2025_01_12", "inventory-drift", "Inventory reservation drift", "resolved", "sev3", "2025-01-12T09:05:00.000Z", "2025-01-12T09:22:00.000Z", "2025-01-12T11:15:00.000Z", 46, 410000],
  ["inc_label_printer_queue_2024_12_19", "label-printer-queue", "Label printer queue saturation", "resolved", "sev3", "2024-12-19T20:41:00.000Z", "2024-12-19T20:49:00.000Z", "2024-12-19T21:30:00.000Z", 57, 338000],
  ["inc_edi_ack_delay_2024_11_27", "edi-ack-delay", "EDI acknowledgement delay", "resolved", "sev2", "2024-11-27T04:10:00.000Z", "2024-11-27T04:17:00.000Z", "2024-11-27T05:25:00.000Z", 121, 2150000],
  ["inc_customer_portal_auth_2024_10_08", "customer-portal-auth", "Customer portal auth errors", "resolved", "sev2", "2024-10-08T15:33:00.000Z", "2024-10-08T15:35:00.000Z", "2024-10-08T16:12:00.000Z", 33, 285000]
] as const;

export const KNOWLEDGE_DOCUMENTS = [
  ["kdoc_warehouse_latency_runbook", "ksrc_confluence", "warehouse-latency-runbook", "Warehouse API latency triage", "runbook", "Check p95 latency, queue depth, Postgres connection saturation, and worker autoscaling before failing over to regional buffer mode.", "RUN-WH-API-004", "commandgrid://confluence/runbooks/warehouse-api-latency", "v4", "2025-02-10T12:00:00.000Z"],
  ["kdoc_order_router_slo", "ksrc_confluence", "order-router-slo", "Order Router SLO policy", "policy", "Order Router must maintain 99.5% successful route assignment under 600ms for tier-0 fulfillment events.", "POL-OR-012", "commandgrid://confluence/policies/order-router-slo", "v2", "2025-01-07T12:00:00.000Z"],
  ["kdoc_customer_credit_matrix", "ksrc_drive", "customer-credit-matrix", "Customer credit approval matrix", "finance", "Platinum accounts require finance approval above $25,000 aggregate exposure or any manual credit over $2,500.", "FIN-CRED-009", "commandgrid://drive/finance/customer-credit-matrix", "v7", "2025-02-01T12:00:00.000Z"],
  ["kdoc_incident_comms_playbook", "ksrc_confluence", "incident-comms-playbook", "Incident communications playbook", "playbook", "Support publishes proactive customer updates every 30 minutes during SEV1 and SEV2 operational incidents.", "SUP-COMMS-002", "commandgrid://confluence/playbooks/incident-comms", "v5", "2025-01-20T12:00:00.000Z"],
  ["kdoc_wms_connection_pool", "ksrc_github", "wms-connection-pool", "WMS connection pool notes", "engineering-note", "Warehouse API pods share a 90-connection pool per region; pool wait above 250ms triggers brownout protection.", "ENG-WMS-117", "commandgrid://github/platform/wms-connection-pool.md", "a13f9d2", "2025-02-12T12:00:00.000Z"],
  ["kdoc_buffer_mode_sop", "ksrc_confluence", "buffer-mode-sop", "Regional buffer mode SOP", "sop", "Buffer mode queues route assignments locally and replays to WMS once API latency returns below 500ms p95 for ten minutes.", "OPS-BUF-006", "commandgrid://confluence/sops/regional-buffer-mode", "v3", "2025-01-18T12:00:00.000Z"],
  ["kdoc_carrier_gateway_retry", "ksrc_confluence", "carrier-gateway-retry", "Carrier gateway retry policy", "runbook", "Carrier retry storms are limited to exponential backoff with jitter and customer-specific throttles.", "RUN-CAR-021", "commandgrid://confluence/runbooks/carrier-gateway-retry", "v6", "2025-01-29T12:00:00.000Z"],
  ["kdoc_inventory_reconcile", "ksrc_github", "inventory-reconcile", "Inventory reconciliation job", "runbook", "Reservation drift is reconciled by warehouse, SKU, and order promise window every fifteen minutes.", "ENG-INV-044", "commandgrid://github/warehouse/inventory-reconcile.md", "b81c2aa", "2025-01-14T12:00:00.000Z"],
  ["kdoc_label_queue_ops", "ksrc_confluence", "label-queue-ops", "Label queue operations guide", "runbook", "Printer spool saturation should be drained by moving low-priority batches to the overflow label pool.", "RUN-LBL-018", "commandgrid://confluence/runbooks/label-queue", "v2", "2024-12-20T12:00:00.000Z"],
  ["kdoc_edi_ack_sla", "ksrc_drive", "edi-ack-sla", "EDI acknowledgement SLA", "policy", "Retail EDI 855 acknowledgements must be transmitted within 20 minutes for platinum customers.", "POL-EDI-003", "commandgrid://drive/compliance/edi-ack-sla", "v4", "2024-11-30T12:00:00.000Z"],
  ["kdoc_auth_error_matrix", "ksrc_confluence", "auth-error-matrix", "Customer portal auth error matrix", "runbook", "Portal auth 5xx errors above 2% should trigger IdP failover and customer status banner updates.", "RUN-AUTH-031", "commandgrid://confluence/runbooks/auth-errors", "v3", "2024-10-12T12:00:00.000Z"],
  ["kdoc_post_incident_template", "ksrc_drive", "post-incident-template", "Post incident report template", "template", "Post-incident reports include timeline, impact, customer communications, decisions, and follow-up owners.", "TPL-PIR-001", "commandgrid://drive/templates/post-incident-report", "v8", "2025-01-01T12:00:00.000Z"]
] as const;

export const SUPPORT_TICKETS = [
  ["ticket_10441", "SUP-10441", "Apex Retail orders missing warehouse confirmation", "open", "urgent", "email", "cust_apex_retail"],
  ["ticket_10442", "SUP-10442", "Bluebird Home shipment promises slipping", "open", "high", "portal", "cust_bluebird_home"],
  ["ticket_10443", "SUP-10443", "Evergreen Health asks for ETA on medical supply orders", "open", "urgent", "phone", "cust_evergreen_health"],
  ["ticket_10444", "SUP-10444", "Metro Grocery delayed store replenishment feed", "pending", "high", "slack-connect", "cust_metro_grocery"],
  ["ticket_10445", "SUP-10445", "Pinnacle Sports batch delayed in north warehouse", "open", "medium", "email", "cust_pinnacle_sports"],
  ["ticket_10446", "SUP-10446", "Cascade Outdoors requests incident summary", "pending", "medium", "portal", "cust_cascade_outdoors"]
] as const;

export const SYSTEM_LOG_MESSAGES = [
  ["log_warehouse_001", "svc_warehouse_api", "error", "p95 latency 1840ms exceeds 450ms SLO for routeAssignment.create", "trace-wh-18-001"],
  ["log_warehouse_002", "svc_warehouse_api", "warn", "postgres pool wait time p95=310ms active=88 idle=2", "trace-wh-18-002"],
  ["log_order_router_001", "svc_order_router", "warn", "route assignment callbacks delayed for midwest-2 warehouse", "trace-or-18-003"],
  ["log_warehouse_003", "svc_warehouse_api", "error", "timeout fetching inventory hold for order NS-900149", "trace-wh-18-004"],
  ["log_customer_portal_001", "svc_customer_portal", "info", "status banner published for affected customers", "trace-cp-18-005"],
  ["log_carrier_001", "svc_carrier_gateway", "info", "carrier manifest queue healthy while upstream warehouse API degraded", "trace-car-18-006"],
  ["log_warehouse_004", "svc_warehouse_api", "warn", "autoscaler pending two pods in us-central fulfillment cluster", "trace-wh-18-007"],
  ["log_inventory_001", "svc_inventory_sync", "info", "inventory sync lag stable under 90 seconds", "trace-inv-18-008"]
] as const;
