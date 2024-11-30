---
mentions:
  - Mirucow
---

# 通信

実際の通信上でのデータ構造について説明します。

::: warning 注意
あくまで通信上でのデータ構造であるため、バイトデータの読み書きにのみ焦点を当てています。プログラムで扱いやすい形ではないため、実装には注意が必要です。
:::

## 型リスト

RakNetのプロトコルで使用されるデータ型の一覧です。

| 型 | サイズ | 説明 |
| --- | --- | --- |
| `bit` | 1ビット | |
| `u8` | 1バイト | 符号なし8ビット整数(Unsigned Int 8) |
| `BE/LE u16 u24 u64` | 2/3/8バイト | ビッグエンディアン/リトルエンディアン符号なし整数。[詳細](#be-le-u16-u24-u64) |
| `String` | 可変 | 文字列。[詳細](#string) |
| `Magic` | 16バイト | 固定のバイト列。[詳細](#magic) |
| `Address` | 7/29バイト | IPアドレスとポート番号の組。IPv4の場合は7バイト、IPv6の場合は29バイト。[詳細](#address) |

### BE/LE u16 u24 u64 {#be-le-u16-u24-u64}

`BE/LE`: ビッグエンディアン(Big Endian)またはリトルエンディアン(Little Endian)

`u16 u24 u64`: 符号なし16ビット整数、24ビット整数、64ビット整数。

```plaintext
BE u16
LE u24
BE u64 など...
```

### String

`String`型は、文字列を表します。最初に`BE u16`で文字列の長さを表し、その後に文字列本体（UTF-8）が続きます。

```plaintext
[文字列の長さ: BE u16] [文字列本体: u8[文字列の長さ]]
```

### Magic

`Magic`型は、固定のバイト列を表します。16バイトです。

```plaintext
[0x00, 0xff, 0xff, 0x0, 0xfe, 0xfe, 0xfe, 0xfe, 0xfd, 0xfd, 0xfd, 0xfd, 0x12, 0x34, 0x56, 0x78]
```

### Address

`Address`型は、IPアドレスとポート番号の組を表します。先頭の1バイトが4の場合はIPv4、6の場合はIPv6です。

```plaintext
[4: 1バイト] [IPアドレス: u8[4]] [ポート番号: BE u16]
[6: 1バイト] [アドレスファミリー: BE u16] [ポート番号: BE u16] [フロー情報: BE u32] [IPv6アドレス: BE u16[8]] [スコープID: BE u32]
```

#### IPv4

| フィールド | 型 | 説明 |
| --- | --- | --- |
| ip | u8[4] | IPv4アドレス |
| port | BE u16 | ポート番号 |

#### IPv6

| フィールド | 型 | 説明 |
| --- | --- | --- |
| address_family | BE u16 | |
| port | BE u16 | ポート番号 |
| flow_info | BE u32 | |
| ip | BE u16[8] | IPv6アドレス |
| scope_id | BE u32 | |

## メッセージ

RakNetのメッセージは、以下の構造を持ちます。

```plaintext
[メッセージのID: 1バイト] [メッセージ本体: Nバイト]
```

### ID

メッセージのIDは、メッセージの種類を識別するための番号です。RakNetでは、メッセージのIDは1バイトで表現されます。そのため、IDの範囲は0から255までとなります。

::: tip
`0xfe`のGamePacketは、Minecraft Bedrock Edition用のパケットの送受信で使用されます。つまり、RakNetの仕様としては定義されていません。
:::

| ID | メッセージ |
| --- | --- |
| 0x00 | ConnectedPing |
| 0x01 | UnconnectedPing |
| 0x03 | ConnectedPong |
| 0x05 | OpenConnectionRequest1 |
| 0x06 | OpenConnectionReply1 |
| 0x07 | OpenConnectionRequest2 |
| 0x08 | OpenConnectionReply2 |
| 0x09 | ConnectionRequest |
| 0x10 | ConnectionRequestAccepted |
| 0x12 | AlreadyConnected |
| 0x13 | NewIncomingConnection |
| 0x15 | DisconnectionNotification |
| 0x1c | UnconnectedPong |
| 0xfe | GamePacket（Minecraft Bedrock Editionのみ） |

### ConnectedPing

通信のレイテンシを計測するためのメッセージで、クライアントからサーバーに送信されます。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| client_timestamp | BE u64 | |

### ConnectedPong

ConnectedPingに対する応答として、サーバーからクライアントに送信されます。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| client_timestamp | BE u64 | |
| server_timestamp | BE u64 | |

### UnconnectedPing

コネクション確立前に、サーバーの存在を確認するためのメッセージです。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| time | BE u64 | |
| magic | Magic | |
| client_guid | BE u64 | |

### UnconnectedPong

UnconnectedPingに対する応答として、サーバーからクライアントに送信されます。MOTDなどの情報も含まれます。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| time | BE u64 | |
| server_guid | BE u64 | |
| magic | Magic | |
| motd | String | |

### OpenConnectionRequest1

mtuは、通信時に使用する最大データサイズを計算するために使用されます。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| magic | Magic | |
| protocol_version | u8 | |
| mtu | u8[N] | |

#### MTUの測定 {#mtu}

mtuフィールドは、限界まで埋められた空のバイト列です。そのため、このメッセージ=RakNetのレイヤーで扱える最大のデータサイズ、つまりMTUです。

### OpenConnectionReply1

| フィールド | 型 | 説明 |
| --- | --- | --- |
| magic | Magic | |
| server_guid | BE u64 | |
| use_security | bool | |
| mtu | BE u16 | |

### OpenConnectionRequest2

| フィールド | 型 | 説明 |
| --- | --- | --- |
| magic | Magic | |
| server_address | Address | |
| mtu | BE u16 | |
| client_guid | BE u64 | |

### OpenConnectionReply2

| フィールド | 型 | 説明 |
| --- | --- | --- |
| magic | Magic | |
| server_guid | BE u64 | |
| client_address | Address | |
| mtu | BE u16 | |
| encryption_enabled | bool | |

### ConnectionRequest

| フィールド | 型 | 説明 |
| --- | --- | --- |
| client_guid | BE u64 | |
| client_timestamp | BE u64 | |
| use_security | bool | |

### ConnectionRequestAccepted

| フィールド | 型 | 説明 |
| --- | --- | --- |
| client_address | Address | |
| client_id | BE u16 | |
| server_internal_addresses | Address[10] | |
| client_timestamp | BE u64 | |
| server_timestamp | BE u64 | |

### AlreadyConnected

| フィールド | 型 | 説明 |
| --- | --- | --- |
| magic | Magic | |
| client_guid | BE u64 | |

### NewIncomingConnection

| フィールド | 型 | 説明 |
| --- | --- | --- |
| server_address | Address | |
| client_internal_addresses | Address[20] | |
| client_timestamp | BE u64 | |
| server_timestamp | BE u64 | |

### DisconnectionNotification

IDのみのメッセージです。クライアントがサーバーに対して切断を通知するために使用されます。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| - | - | |

### GamePacket

Minecraft Bedrock Editionのゲーム内のパケットを送受信するためのメッセージです。ID以降のデータは、[Minecraft Bedrock Editionのプロトコル](../../protocol/intro.md)を参照してください。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| - | - | |

## データグラム

コネクションの確立後は、データグラムとACK/NAKを通してメッセージの送受信などを行います。

データグラム(+ACK/NAK)は、以下の構造を持ちます。

```plaintext
[データグラムヘッダー: 1バイト] [データグラム or ACK/NAK: Nバイト]
```

::: info
オリジナルのRakNetでは、ACK/NAKもデータグラムとして扱われているので、データグラムヘッダーで区別する必要があります。
:::

### データグラムヘッダー

データグラムヘッダーは、データグラムかACK/NAKかを識別するためのフラグを持っています。

is_validが１の時、is_ackが１の場合はACK、is_nakが１の場合はNAK、どちらも０の場合はデータグラムです。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| is_valid | bit | データグラムが有効かどうか |
| is_ack | bit | ACKかどうか |
| is_nak | bit | NAKかどうか |

### データグラム {#datagram}

データグラムは、シーケンス番号とフラグメントの配列から構成されています。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| sequence_number | LE u24 | シーケンス番号 |
| fragments | Fragment[N] | 一つ以上の[フラグメント](#fragment)が含まれる。空になるまで読み取りを続ける必要がある。 |

#### シーケンス番号

シーケンス番号は、データグラムの順序を識別するための番号で、`LE u24`で表現されます。

データグラムを送信する際、シーケンス番号は０からスタートしてその後、１ずつ増加します。

受信側がデータグラムが通信中にロストしたかどうかを判断するために使用され、ロストした場合はNAKを送信して再送信を要求します。

データグラムを正常に受信した場合、ACKを送信して通知します。

### ACK / NAK {#ack-nak}

ACKは特定のシーケンス番号を受信したことを通知するために使用され、NAKは特定のシーケンス番号を受信していないことを通知するために使用されます。

データ構造は両方とも同じです。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| size | BE u16 | |
| records | Record[size] | |

#### Record

| フィールド | 型 | 説明 |
| --- | --- | --- |
| is_single | bool | |
| min | LE u24 | |
| max | LE u24 | is_single が `false` の場合のみ |

### フラグメント {#fragment}

フラグメントは、メッセージや巨大なメッセージの一部を持っており、信頼性を確保するためのデータも含まれています。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| bit_flags | u8 | 様々な情報を持つフラグ。[詳細](#bit-flags) |
| length | BE u16 | bodyの長さ。ビットでの長さなので、8倍にする必要がある。 |
| reliable_index | LE u24 | `reliability`がReliable系の場合のみ。 |
| sequenced_index | LE u24 | `reliability`がSequenced系の場合のみ。 |
| ordering_index | LE u24 | `reliability`がOrderedまたはSequenced系の場合のみ。 |
| ordering_channel | u8 | `reliability`がOrderedまたはSequenced系の場合のみ。 |
| split_size | BE u32 | `is_split`が1の場合のみ。 |
| split_id | BE u16 | `is_split`が1の場合のみ。 |
| split_index | BE u32 | `is_split`が1の場合のみ。 |
| body | u8[length * 8] | |

#### ビットフラグ {#bit-flags}

| フィールド | 型 | 説明 |
| --- | --- | --- |
| reliability | bit[3] | 信頼性の種類。[詳細](#reliability) |
| is_split | bit | 分割されたフラグメントかどうか。 |

### 信頼性 {#reliability}

信頼性は、フラグメントの取り扱いを決定するための情報です。

| 種類 | 値 |
| --- | --- |
| Unreliable | 0 |
| UnreliableSequenced | 1 |
| Reliable | 2 |
| ReliableOrdered | 3 |
| ReliableSequenced | 4 |
| UnreliableWithAckReceipt | 5 |
| ReliableWithAckReceipt | 6 |
| ReliableOrderedWithAckReceipt | 7 |

## 参考

- [Magic](https://github.com/facebookarchive/RakNet/blob/master/Source/RakPeer.cpp#L135)
- [メッセージID](https://github.com/facebookarchive/RakNet/blob/master/Source/MessageIdentifiers.h#L51)
- [データグラムヘッダー](https://github.com/facebookarchive/RakNet/blob/master/Source/ReliabilityLayer.cpp#L110)
- [フラグメント](https://github.com/facebookarchive/RakNet/blob/master/Source/ReliabilityLayer.cpp#L2610)
- [信頼性](https://github.com/facebookarchive/RakNet/blob/master/Source/PacketPriority.h#L46)