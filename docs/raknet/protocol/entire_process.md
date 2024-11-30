---
mentions:
  - Mirucow
---

# 全体の処理

## 定義

[通信](communication)でも、データグラムやフラグメントの通信上でのデータ構造が定義されていますが、ここではプログラムで扱いやすいような形で定義します。

### Datagram

| フィールド | 型 | 説明 |
| --- | --- | --- |
| sequence_number | u24 | シーケンス番号 |
| fragments | Fragment[N] | |

### ACK / NAK

[通信: ACK / NAK](communication#ack-nak)の形でもいいですが、ACK・NAKされたシーケンス番号を配列として取得することができるようなメゾットを用意しておくと便利です。

### Fragment {#fragment}

| フィールド | 型 | 説明 |
| --- | --- | --- |
| reliability | u8 | |
| is_split | bool | |
| reliable_index | u24 | 信頼性がReliableの場合のみ |
| sequenced_index | u24 | 信頼性がSequencedの場合のみ |
| ordering_index | u24 | 信頼性がOrderedまたはSequencedの場合のみ |
| ordering_channel | u8 | 信頼性がOrderedまたはSequencedの場合のみ |
| split_size | u32 | is_splitがtrueの場合のみ |
| split_id | u16 | is_splitがtrueの場合のみ |
| split_index | u32 | is_splitがtrueの場合のみ |
| body | u8[N] | |

### 信頼性 {#reliability}

信頼性は、フラグメントの取り扱いを決定するための情報です。

| 種類 | 値 | Reliable | Ordered | Sequenced |
| --- | --- | --- | --- | --- |
| Unreliable | 0 | ✕ | ✕ | ✕ |
| UnreliableSequenced | 1 | ✕ | ✕ | ○ |
| Reliable | 2 | ○ | ✕ | ✕ |
| ReliableOrdered | 3 | ○ | ○ | ✕ |
| ReliableSequenced | 4 | ○ | ✕ | ○ |
| UnreliableWithAckReceipt | 5 | ✕ | ✕ | ✕ |
| ReliableWithAckReceipt | 6 | ○ | ✕ | ✕ |
| ReliableOrderedWithAckReceipt | 7 | ○ | ○ | ✕ |

- Reliable: フラグメントが必ず相手に到達することを保証します。具体的には、相手からACKを受信するまで再送を行います。相手に到達することが重要な場合に使用されます。
- Ordered: 複数のフラグメントが送信した順に相手に到達することを保証します。具体的には、受信側が順番に並べ替えてから処理します。順番通りに処理されることが重要な場合に使用されます。
- Sequenced: 受信側が最新のフラグメントのみを受け取り、それより古いフラグメントは破棄されます。プレイヤーの移動など、最新の情報のみが必要な場合に使用されます。

## コネクション

RakNetでは、コネクションの確立前はメッセージをそのまま送受信し、確立後はデータグラムに内包される形でメッセージの送受信を行います。

### コネクションの確立

コネクションの確立は、以下の流れで行われます。

C: クライアント S: サーバー

| 通信 | メッセージ | 説明 |
| --- | --- | --- |
| C -> S | [OpenConnectionRequest1](communication#openconnectionrequest1) | MTUを正確に測定する必要がある。 |
| S -> C | [OpenConnectionReply1](communication/#openconnectionreply1) | |
| C -> S | [OpenConnectionRequest2](communication#openconnectionrequest2) | |
| S -> C | [OpenConnectionReply2](communication#openconnectionreply2) | ここでコネクションが確立される。これ以降はデータグラムによってメッセージのやり取りが行われる。 |

基本的にコネクションの確立には、正確に測定されたMTUが必要です。MTUは、通信時に送信するデータの最大サイズを表します。これを超えるデータを送信する時には、データを分割して送信する必要があります。

正確な測定については、[MTUの測定](communication#mtu)を参照してください。

### コネクションの確立後

コネクションの確立後も、アプリケーションのパケットの送受信が可能になるまでにはいくつかのステップがあります。

C: クライアント S: サーバー

| 通信 | メッセージ | 説明 |
| --- | --- | --- |
| C -> S | [ConnectionRequest](communication#connectionrequest) | |
| S -> C | [ConnectionRequestAccepted](communication#connectionrequestaccepted) | |
| C -> S | [NewIncomingConnection](communication#newincomingconnection) | ここからアプリケーションのパケットを送受信することができる。 |

::: tip アプリケーションのパケット
Minecraft Bedrock Editionでは、ID`0xfe`のGamePacketというメッセージを送受信することで、ゲーム内のパケットを送受信します。[詳細](communication#gamepacket)
:::

## 送受信システム

RakNetの送受信では、データグラムを使用します。データグラムは複数のフラグメントを含んでいることがあります。

そのため、送受信時に適切にフラグメントを処理する必要があります。

### 主要な用語

| 用語 | 説明 |
| --- | --- |
| ACKキュー | 受信したデータグラムのシーケンス番号を保持しているキュー。Tick処理時にキュー内の全てのシーケンス番号を持ったACKを送信する。 |
| NAKキュー | 受信されていないデータグラムのシーケンス番号を保持しているキュー。Tick処理時にキュー内の全てのシーケンス番号を持ったNAKを送信する。 |
| 送信キュー | 送信するフラグメントを保持しているキュー。Tick処理時にキュー内のフラグメントをデータグラムに入れて送信する。 |
| 再送用キャッシュ | シーケンス番号をキーとして、各データグラムの送信時刻・信頼性がReliableなフラグメントを保持するキャッシュ。ACKを受信した際に、指定されたシーケンス番号のキャッシュを削除し、送信時刻からRTO(再送タイムアウト)を超過したデータグラムのフラグメントは再送信の対象となる。 |
| RTT | ラウンドトリップタイムの略称で、データグラムの送信から対応するACKを受信するまでの時間を示す。 |
| SRTT | 平滑化RTT(Smoothed RTT)の略称で、過去のRTT値を元に平均化されたRTT。通信の遅延を安定的に反映する。 |
| RTTVAR | RTTの分散を示す値で、通信遅延のばらつきを表す。 |
| RTO | 再送タイムアウトの略称で、再送信のタイミングを決定するための値。RTO = SRTT + 4 * RTTVAR として計算される。 |

### RTOの計算 {#rto}

RTOは、再送タイムアウトの略称で、再送信のタイミングを決定するための値です。通信の状況によって変動するため、動的に計算する必要があります。

RakNetでは、以下の式でRTOを計算します。

$$ RTO = SRTT + 4 \times RTTVAR $$

また、ACKを受信した時にはRTTとRTTVARを更新します。

$$
\alpha = 0.875,\quad \beta = 0.875
$$

$$
\begin{align*}
SRTT &= (1 - \alpha) \times RTT + \alpha \times SRTT \\\\
RTTVAR &= (1 - \beta) \times |RTT - SRTT| + \beta \times RTTVAR
\end{align*}
$$

初期値としては、以下の設定がおすすめです。

- $SRTT = 100$
- $RTTVAR = 50$


### 送信

送信方法には2種類あります：

1. 即時送信
   - メリット：遅延なく即座に送信できる
   - デメリット：データグラムにその時に送信するフラグメントのみを格納するため、MTUを効率的に使用できない場合がある

2. Tick単位での定期送信（推奨）
   - メリット：MTUを最大限活用し、効率的に送信できる
   - デメリット：次のTickまで送信が待機される

通常は効率性を重視してTick単位での定期送信を使用します。`ConnectedPing`や`ConnectedPong`などの特定のメッセージは即時送信を使用することがあります。


![](https://mermaid.ink/svg/pako:eNp9U99rE0EQ_leWeZRLIXf5cdkHoeibVMH2Sc-H7d2ahpq7crmINQTcW01TrRCKP14EG8RiCRZBUEFr_pjp2fpfuLendm2C-3DMfjffzHwzOz3wo4ADhU7CEn65xZoxa5fu2l5I1NEgWWn566RXIPlZLZNS6SJZdQzInoUcDd28cMvAKnOw6hlm5qDk5wNxPB1j-h7lW5TfUByifI7yANMPKMcoP6IcmiVQkg2eKtLJs3ea9AalxPSzYmeDR4p9feUaprunn5Q9RPEa5VYeNZ3qeAco91BMstEExXdMd1Dso3io3f6T06Fk9j-KJ5huzwmf7h4fvfoxHJkNoWTx0hVDY07VyG9fFC9VKUUrzKZRcnXxPE8jc3kFs__HKOa6zMNgiXc6rMnN8frFeH3bnIdfzpWOdUe_al1fVKpZ7dnOC4Nkzxni5HR6lD3eO1eRUctsInFo6s-fI9XfbGv_ZDQAC9o8brNWoJ6x1uFBssbb3AOqzIDF6x54YV_5sW4SLW-GPtAk7nIL4qjbXAN6m93pqFt3Izjbgb_oBgtvRNE_d6A9uAe07i401HFdt1JzanWnYcEm0Iq9UHbqNbdRdWynZtvVvgX3dYCyBTxoJVG8VKyc3rz-L0aJgbA)

### 受信

受信システムでは、データを3つの種類に分類して処理します：

1. データグラム受信時
   - スライディングウィンドウを使用して未受信のデータを監視
   - 受信したデータグラムの処理を実行
   - ACKキューに受信したシーケンス番号を追加
   - NAKキューに未受信のシーケンス番号を追加

2. ACK受信時
   - 再送用キャッシュから対応するキャッシュを削除(送信成功の確認)
   - RTT(ラウンドトリップタイム)を計測
   - SRTT(平滑化RTT)とRTTVAR(RTT分散)を更新

3. NAK受信時
   - 再送用キャッシュ内の、未到達と報告されたデータグラムのフラグメントを次のTickで再送信に含める

このように、それぞれの受信データに応じて適切な処理を実行することで、信頼性の高い通信を実現します。


![](https://mermaid.ink/svg/pako:eNqVVF1PE0EU_SvNPJqWpLulH_tgQuTN6AM0Pmh9WHZXaLBdUrZGbJows0ApH2lDBII8WAJUoNpgJGkwan_MdVv5F96ZobJtWqPzMJk5c-fOPefcTIEYtmkRjSw6umNNpvXZnJ4JvVJS2QAOPRwIhe4HJh487NtP6o6I6wMfT2CQREQufitQkAAfz-49F3Ez4TtsRl6dUXo3JagFOlslr_kO6C6wLaDvwS2B-w1YG9gluOfg1oA2gX0C9xhcF1gL3FNgO97a9s0y7b49Gzyim8DKXnnj5uDE946C7-xdAt0HujKVTPIEqy7QBizTab6nZzg_mZjCg87hFYbKu8V-mj0xhnE1fFwNydVQfJAiIdUHqRKK-BUxUBFg15w5O-FaMOT2hWvB6rdrtyzWO4LwLrjr_lf4bcZ59g6BfgC6DfSCK0OPucKsjLS9yv7P9lHvtI66iJiVEfq3BPhZ1HLd3b3wKi0sARtB6H_KT2njV_u7t1HzM8Ry_icf9tFf80WG5-OWC7bnAjwSKq1zkyt7wDa80lfhfN0r1bvVtaHWIpNhrpphvznmP7brqOb01lY5-WGVoiOdj2hHM5k25mWdnQM0siFz8UW1AfQH0ENgmwMUdKxL-tlDUEiNT7yY2pVXve0RZKnxaQDu9fUIt2QoCZKMlcvoaRO_ECFVijhzVsZKEQ2Xpp6bT5FUtohxet6xp5eyBtGcXN4Kkpydn50j2gv95SLu8gvm3f_zB13Qs09tu29PtAJ5TbRYfCyBIx6PR6JqNKYmgmSJaBFlLKzGovHEuKqoUUUZLwbJG5EgHCSWmXbs3CP53Ylfr_gbqOdNPw)