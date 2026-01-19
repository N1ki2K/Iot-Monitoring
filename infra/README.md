## 📁 Folder Structure


infra/
└── mosquitto/
    ├── mosquitto.conf
    ├── data/
    │   └── mosquitto.db   (created automatically)
    └── README.md



docker compose up -d

| Setting        | Value                               |
| -------------- | ----------------------------------- |
| Protocol       | MQTT                                |
| Host (local)   | `localhost`                         |
| Host (LAN)     | `<PC_LAN_IP>` (e.g. `192.168.1.50`) |
| Port           | `1883`                              |
| Authentication | Disabled (development only)         |

