---
mentions:
  - Mirucow
---

# 送信

## 概要

送信は、メッセージの送信とTick処理の二つのフェーズに分けられます。

### メッセージの送信

メッセージからフラグメントを作成して送信キューに追加するフェーズです。ここでは、メッセージのデータがMTUを超える場合の分割や、信頼性に応じたヘッダーの設定などが行われます。

### Tick処理

Tick処理は、送信キューに追加されたフラグメントをデータグラムに入れて送信するフェーズです。また、再送用キャッシュに保持されているデータグラムの再送や、ACK/NAKの送信も行います。

![](https://mermaid.ink/svg/pako:eNp9U99rE0EQ_leWeZRLIXf5cdkHoeibVMH2Sc-H7d2ahpq7crmINQTcW01TrRCKP14EG8RiCRZBUEFr_pjp2fpfuLendm2C-3DMfjffzHwzOz3wo4ADhU7CEn65xZoxa5fu2l5I1NEgWWn566RXIPlZLZNS6SJZdQzInoUcDd28cMvAKnOw6hlm5qDk5wNxPB1j-h7lW5TfUByifI7yANMPKMcoP6IcmiVQkg2eKtLJs3ea9AalxPSzYmeDR4p9feUaprunn5Q9RPEa5VYeNZ3qeAco91BMstEExXdMd1Dso3io3f6T06Fk9j-KJ5huzwmf7h4fvfoxHJkNoWTx0hVDY07VyG9fFC9VKUUrzKZRcnXxPE8jc3kFs__HKOa6zMNgiXc6rMnN8frFeH3bnIdfzpWOdUe_al1fVKpZ7dnOC4Nkzxni5HR6lD3eO1eRUctsInFo6s-fI9XfbGv_ZDQAC9o8brNWoJ6x1uFBssbb3AOqzIDF6x54YV_5sW4SLW-GPtAk7nIL4qjbXAN6m93pqFt3Izjbgb_oBgtvRNE_d6A9uAe07i401HFdt1JzanWnYcEm0Iq9UHbqNbdRdWynZtvVvgX3dYCyBTxoJVG8VKyc3rz-L0aJgbA)

### 主要な用語

| 用語 | 説明 |
| --- | --- |
| 送信キュー | 送信するフラグメントを保持しているキュー。Tick処理時にキュー内のフラグメントをデータグラムに入れて送信する。 |
| ACKキュー | 受信したデータグラムのシーケンス番号を保持しているキュー。Tick処理時にキュー内の全てのシーケンス番号を持ったACKを送信する。 |
| NAKキュー | 受信されていないデータグラムのシーケンス番号を保持しているキュー。Tick処理時にキュー内の全てのシーケンス番号を持ったNAKを送信する。 |
| 再送用キャッシュ | シーケンス番号をキーとして、各データグラムの送信時刻・信頼性がReliableなフラグメントを保持するキャッシュ。ACKを受信した際に、指定されたシーケンス番号のキャッシュを削除し、送信時刻からRTO(再送タイムアウト)を超過したデータグラムのフラグメントは再送信の対象となる。 |
| RTO | 再送タイムアウトの略称で、再送信のタイミングを決定するための値。RTO = SRTT + 4 * RTTVAR として計算される。 |

## メッセージの送信

メッセージの送信は、フラグメントを作成して送信キューに追加するフェーズです。メッセージのデータがMTUを超える場合の分割や、信頼性に応じたヘッダーの設定などが行われます。

### 具体的な手順

1. 信頼性がSequencedの場合、`sequenced_index`を設定
2. 信頼性がOrderedの場合、`ordering_index`を設定
3. フラグメントをデータグラムに入れた時のサイズがMTUを超える場合、フラグメントを分割
4. 送信キューに追加

### 全体の流れ

メッセージの送信(正確には送信キューに追加)には、以下の引数が必要です。

- メッセージデータ: `u8[N]`
- [信頼性](entire_process#reliability)
- 使用するチャンネル: `0-31` (信頼性がSequencedかOrderedの場合のみ)

```plaintext
/* 1 */
if Sequenced
  sequenced_indexを設定
/* 2 */
else if Ordered
  ordering_indexを設定

/* 3 */
if フラグメントをデータグラムに入れた時のサイズ>MTU
  フラグメントを分割して全て送信キューに追加
/* 4 */
else
  送信キューに追加
```

### 1.

```plaintext
// next_sequenced_index = [0; 32]

if Sequenced
  fragment.ordering_channel = ordering_channel
  fragment.ordering_index = next_ordering_index[ordering_channel]
  fragment.sequenced_index = next_sequenced_index[ordering_channel]
  next_sequenced_index[ordering_channel]++
```

#### 主要な変数

- `next_sequenced_index`: 32チャンネルそれぞれの次の`sequenced_index`を保持する配列

#### 処理の流れ

1. 引数から得たチャンネル番号を`ordering_channel`に設定
2. `sequenced_index`の設定：
   - 前回同じチャンネルで送信した値+1を設定
   - 初回の場合は0を設定

::: tip
`ordering_index`は通常Sequencedでは不要ですが、RakNet公式実装ではindexが同期されているかを確認するために使用されています。
:::

### 2.

信頼性がOrderedの場合、次の処理を行います。

```plaintext
// next_ordering_index = [0; 32]

if Ordered
  fragment.ordering_channel = ordering_channel
  fragment.ordering_index = next_ordering_index[ordering_channel]
  next_ordering_index[ordering_channel]++
  next_sequenced_index[ordering_channel] = 0
```

#### 主要な変数

- `next_ordering_index`: 32チャンネルそれぞれの次の`ordering_index`を保持する配列

#### 処理の流れ

1. 引数から得たチャンネル番号を`ordering_channel`に設定
2. `ordering_index`の設定：
   - 前回同じチャンネルで送信した値+1を設定
   - 初回の場合は0を設定
3. 同じチャンネルの`sequenced_index`をリセット
   - OrderedとSequencedは同時に同じチャンネルを使用できないため

### 3.

フラグメントをデータグラムに入れた時のサイズがMTUを超える場合、フラグメントを分割する必要があります。

```plaintext
// RakNetHeaderSize = 1 + 3

// mtu = (OpenConnectionRequest1で計測したMTU)
// next_split_id = 0

if フラグメントをデータグラムに入れた時のサイズ>MTU
  let max_size = mtu - RakNetHeaderSize - fragment.get_header_size()
  let split_size = fragment.body.length / max_size + 1

  let split_index = 0

  while split_index < split_size
    // 元のフラグメントをコピー
    let split_fragment = fragment.clone()
    split_fragment.reliabilityをReliableにする
    split_fragment.is_split = true
    split_fragment.split_id = next_split_id
    split_fragment.split_size = split_size
    split_fragment.split_index = split_index
    split_fragment.body = fragment.body.slice(split_index * max_size, (split_index + 1) * max_size)
    split_index++

    送信キューに追加
  
  next_split_id++
```

#### 主要な変数

- `next_split_id`: 次の`split_id`を保持する変数

#### 処理の流れ

1. 分割するフラグメントの数を計算
2. メッセージを分割してフラグメントを作成
   -  この時、分割されたフラグメントの信頼性をReliableに変更(例えば、UnreliableSequencedの場合はReliableSequencedに変更)
3. 作成したフラグメントを送信キューに追加

#### 分割数の計算

RakNetHeaderSizeは、RakNetのヘッダーのサイズです。データグラムヘッダー(1バイト)とシーケンス番号(3バイト)からなります。

MTUからRakNetとフラグメントのヘッダーサイズを引いたサイズが、フラグメントの最大サイズです。このサイズでフラグメントを分割するので、メッセージサイズをこのサイズで割った数に1を足した数が分割数です。

$$ RakNetHeaderSize = 1 + 3 $$
$$ MaxSize = MTU - RakNetHeaderSize - FragmentHeaderSize $$
$$ SplitSize = \frac {body} {MaxSize} + 1 $$

#### フラグメントのヘッダーサイズ

フラグメントのヘッダーのサイズは信頼性・分割されているかどうかによって異なります。詳しくは[フラグメント](communication#fragment)を参照してください。

```plaintext
let fragment_header_size = 0

fragment_header_size += 1 // bit_flags

if Reliable
  fragment_header_size += 3 // reliable_index

if Sequenced
  fragment_header_size += 3 // sequenced_index
  fragment_header_size += 3 // ordering_index
  fragment_header_size += 1 // ordering_channel
else if Ordered
  fragment_header_size += 3 // ordering_index
  fragment_header_size += 1 // ordering_channel

if is_split
  fragment_header_size += 4 // split_size
  fragment_header_size += 2 // split_id
  fragment_header_size += 4 // split_index
```

### 4.

フラグメントをデータグラムに入れた時のサイズがMTU以下の場合、そのまま送信キューに追加します。

```plaintext
else
  送信キューに追加
```

## Tick処理

Tick処理では主に以下の3つの処理を行います。

1. ACK/NAKの送信
2. タイムアウトしたフラグメントの再送
3. 送信キュー内のフラグメントの送信

::: tip
Tick処理の間隔はアプリケーションによって異なりますが、Minecraft Bedrock Editionでは50msごとにTick処理を行っています。
:::

### 全体の流れ

```plaintext
let now = 現在時刻

/* 1 */
if ACKキューが空でない
  ACKを送信

/* 2 */
if NAKキューが空でない
  NAKを送信

// 今回のTick処理で送信するフラグメント
let fragments = []


/* 3 */
if 再送用キャッシュが空でない
  再送用キャッシュ内の送信してからの経過時間がRTOを超えたデータグラムに含まれていたフラグメントをfragmentsに追加

/* 4 */
if 送信キューが空でない
  送信キュー内のフラグメントをfragmentsに追加

/* 5 */
if fragmentsが空でない
  fragments内のフラグメントをデータグラムに入れて送信
```

### 1.

ACKキューは、受信したデータグラムのシーケンス番号を保持しているキューです。Tick処理時にキュー内の全てのシーケンス番号を持ったACKを送信して、キューを空にします。

### 2.

NAKキューは、受信されていないと判断されたデータグラムのシーケンス番号を保持しているキューです。Tick処理時にキュー内の全てのシーケンス番号を持ったNAKを送信して、キューを空にします。

### 3.

再送用キャッシュから、送信してから一定時間(RTO)経過したデータグラムに含まれていたフラグメントを取得し、再送信の準備をします。

```plaintext
if 再送用キャッシュが空でない
  for キャッシュ in 再送用キャッシュ
    let 経過時間 = 現在時刻 - キャッシュの送信時刻
    
    // RTOを超えたフラグメントを再送対象に
    if 経過時間 > RTO
      fragments.push(キャッシュのフラグメント)
      再送用キャッシュから該当エントリを削除
```

#### RTOの計算

RTOは、再送タイムアウトの略称で、再送信のタイミングを決定するための値です。RTOは以下の式で計算されます。

$$ RTO = SRTT + 4 \times RTTVAR $$

SRTTとRTTVARは、ACKを受信した際に計算されます。詳しくは[SRTTとRTTVARの更新](receive#srtt-rttvar)を参照してください。

### 4.

送信キューが空でない場合、送信キュー内の全てのフラグメントを`fragments`に追加します。

```plaintext
if 送信キューが空でない
  fragments.extend(送信キューのフラグメント)
  送信キューを空にする
```

### 5.

`fragments`が空でない場合、`fragments`内のフラグメントをデータグラムに入れて送信します。

```plaintext
// RAKNET_HEADER_SIZE = 1 + 3
// next_sequence_number = 0
// next_reliable_index = 0

// now = 現在時刻

if fragmentsが空でない

  let datagrams = []

  let datagram_size = RAKNET_HEADER_SIZE
  let current_datagram = new Datagram()
  let reliable_fragments = []

  current_datagram.sequence_number = next_sequence_number
  next_sequence_number++
  
  for fragment in fragments
    if datagram_size + fragment.get_size() > mtu
      datagrams.push(current_datagram)
      再送用キャッシュ.insert(current_datagram.sequence_number, (now, reliable_fragments))

      current_datagram = new Datagram()
      reliable_fragments = []
      current_datagram.sequence_number = next_sequence_number
      next_sequence_number++

      datagram_size = RAKNET_HEADER_SIZE

    if fragmentの信頼性がReliable
      fragment.reliable_index = next_reliable_index
      next_reliable_index++

      reliable_fragments.push(fragment)

    current_datagram.fragments.push(fragment)
    datagram_size += fragment.get_size()

  datagrams.push(current_datagram)

  for datagram in datagrams
    datagramを送信
```

#### 主要な変数

- `next_sequence_number`: 次のシーケンス番号を保持する変数
- `next_reliable_index`: 次の`reliable_index`を保持する変数

#### 処理の流れ

1. データグラムを作成。データグラムのシーケンス番号は`next_sequence_number`を使用し、使用後にインクリメントする。
2. `fragments`内のフラグメントをデータグラムに入れていく。
   - フラグメントの信頼性がReliableの場合、`reliable_index`を`next_reliable_index`に設定し、使用後にインクリメントする。そのデータグラムの再送用キャッシュのフラグメントに追加する。
   - フラグメントをデータグラムに入れた時のサイズがMTUを超える場合、1.に戻って新しいデータグラムを作成する。この動作を`fragments`が空になるまで繰り返す。
3. 作成したデータグラムを全て送信する。

#### 重要なポイント

- 送信するときに、データグラムがMTUを超えないように分ける
- 再送用キャッシュにデータグラムのシーケンス番号をキーとして、送信時刻と信頼性がReliableなフラグメントを追加

## 参考

- [送信処理](https://github.com/facebookarchive/RakNet/blob/master/Source/ReliabilityLayer.cpp#L1539)
- [Tick処理](https://github.com/facebookarchive/RakNet/blob/master/Source/ReliabilityLayer.cpp#L1687)