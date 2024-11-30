---
mentions:
  - Mirucow
---

# 受信

## 概要

データを受信した際の処理は、受信したデータがACK、NAK、データグラムのどれであるかによって異なります。

### ACKの場合

再送用キャッシュから、指定されたデータグラムのキャッシュを削除し、新しく取得したRTTを使用して、SRTTとRTTVARを更新します。

### NAKの場合

再送用キャッシュ内の指定されたデータグラムのキャッシュ内のフラグメントを、次のTick処理で再送信する対象としてマークします。

### データグラムの場合

スライディングウィンドウを更新し、欠落していると判断されたデータグラムに対して再送要求(NAK)を行い、フラグメントを取り出して処理を行います。

以下のフローチャートは、受信時の処理の流れを示しています。

![](https://mermaid.ink/svg/pako:eNqVVF1PE0EU_SvNPJqWpLulH_tgQuTN6AM0Pmh9WHZXaLBdUrZGbJows0ApH2lDBII8WAJUoNpgJGkwan_MdVv5F96ZobJtWqPzMJk5c-fOPefcTIEYtmkRjSw6umNNpvXZnJ4JvVJS2QAOPRwIhe4HJh487NtP6o6I6wMfT2CQREQufitQkAAfz-49F3Ez4TtsRl6dUXo3JagFOlslr_kO6C6wLaDvwS2B-w1YG9gluOfg1oA2gX0C9xhcF1gL3FNgO97a9s0y7b49Gzyim8DKXnnj5uDE946C7-xdAt0HujKVTPIEqy7QBizTab6nZzg_mZjCg87hFYbKu8V-mj0xhnE1fFwNydVQfJAiIdUHqRKK-BUxUBFg15w5O-FaMOT2hWvB6rdrtyzWO4LwLrjr_lf4bcZ59g6BfgC6DfSCK0OPucKsjLS9yv7P9lHvtI66iJiVEfq3BPhZ1HLd3b3wKi0sARtB6H_KT2njV_u7t1HzM8Ry_icf9tFf80WG5-OWC7bnAjwSKq1zkyt7wDa80lfhfN0r1bvVtaHWIpNhrpphvznmP7brqOb01lY5-WGVoiOdj2hHM5k25mWdnQM0siFz8UW1AfQH0ENgmwMUdKxL-tlDUEiNT7yY2pVXve0RZKnxaQDu9fUIt2QoCZKMlcvoaRO_ECFVijhzVsZKEQ2Xpp6bT5FUtohxet6xp5eyBtGcXN4Kkpydn50j2gv95SLu8gvm3f_zB13Qs09tu29PtAJ5TbRYfCyBIx6PR6JqNKYmgmSJaBFlLKzGovHEuKqoUUUZLwbJG5EgHCSWmXbs3CP53Ylfr_gbqOdNPw)

### 主要な用語

| 用語 | 説明 |
| --- | --- |
| ACKキュー | 受信したデータグラムのシーケンス番号を保持しているキュー。Tick処理時にキュー内の全てのシーケンス番号を持ったACKを送信する。 |
| NAKキュー | 受信されていないデータグラムのシーケンス番号を保持しているキュー。Tick処理時にキュー内の全てのシーケンス番号を持ったNAKを送信する。 |
| 再送用キャッシュ | シーケンス番号をキーとして、各データグラムの送信時刻・信頼性がReliableなフラグメントを保持するキャッシュ。ACKを受信した際に、指定されたシーケンス番号のキャッシュを削除し、送信時刻からRTO(再送タイムアウト)を超過したデータグラムのフラグメントは再送信の対象となる。 |
| RTT | ラウンドトリップタイムの略称で、データグラムの送信から対応するACKを受信するまでの時間を示す。 |
| SRTT | 平滑化RTT(Smoothed RTT)の略称で、過去のRTT値を元に平均化されたRTT。通信の遅延を安定的に反映する。 |
| RTTVAR | RTTの分散を示す値で、通信遅延のばらつきを表す。 |
| RTO | 再送タイムアウトの略称で、再送信のタイミングを決定するための値。RTO = SRTT + 4 * RTTVAR として計算される。 |

## ACKの場合

ACKを受信したときは、再送用キャッシュから対応するデータグラムのキャッシュを削除し、RTT(ラウンドトリップタイム)を使ってSRTTとRTTVARを更新します。

### 具体的な手順

1. 現在の時刻を取得します。
2. ACKに含まれる各シーケンス番号について、以下を行います。
   - 再送用キャッシュにそのシーケンス番号のデータグラムが存在するか確認します。
   - 存在する場合、そのデータグラムの送信時刻を用いてRTTを計算します。

    $$ RTT = 現在時刻 - データグラムの送信時刻 $$

   - 計算したRTTを使用して、SRTTとRTTVARを更新します。
   - 再送用キャッシュからそのデータグラムを削除します。

#### コード例

```plaintext
let now = 現在時刻

for sequence_number in ACKに含まれるシーケンス番号
  if sequence_numberが再送用キャッシュ内に存在する
  let cache = 再送用キャッシュ[sequence_number]
  let rtt = now - cache.送信時刻

  SRTTとRTTVARを更新する
  再送用キャッシュからsequence_numberのキャッシュを削除
```

### SRTTとRTTVARの更新 {#srtt-rttvar}

SRTT(平滑化されたRTT)とRTTVAR(RTTの分散)は、再送タイムアウト(RTO)の計算に用いる重要な値です。

- SRTT：過去のRTT値を元に平均化されたRTTで、通信の遅延を安定的に反映します。
- RTTVAR：RTTの変動幅を示し、通信遅延のばらつきを表します。

新しいRTTが得られるたびに、以下の式でこれらの値を更新します。

$$
\alpha = 0.875,\quad \beta = 0.875
$$

$$
\begin{align*}
SRTT &= (1 - \alpha) \times RTT + \alpha \times SRTT \\\\
RTTVAR &= (1 - \beta) \times |RTT - SRTT| + \beta \times RTTVAR
\end{align*}
$$

この更新により、最新の通信状況を反映しつつ、値の急激な変動を抑えることができます。

初期値としては、以下の設定がおすすめです。

- $SRTT = 100$
- $RTTVAR = 50$

## NAKの場合

NAKを受信したときは、再送用キャッシュ内の指定されたデータグラムを次のTick処理で再送信する対象としてマークします。

### 具体的な手順

1. NAKに含まれる各シーケンス番号について、以下を行います。
   - 再送用キャッシュにそのシーケンス番号のデータグラムが存在するか確認します。
   - 存在する場合、そのデータグラムの送信時刻を0に設定します。

送信時刻を0に設定することで、次のTick処理で再送対象として判断されます。勿論、他の方法でも再送信の判断をさせることは可能です。

#### コード例

```plaintext
for sequence_number in NAKに含まれるシーケンス番号
  if sequence_numberが再送用キャッシュ内に存在する
   let cache = 再送用キャッシュ[sequence_number]
   cache.送信時刻 = 0
```

## データグラムの場合

データグラムを受信した際は、以下の2つの処理を行います。

1. [スライディングウィンドウの更新](#sliding-window)
2. [フラグメントの処理](#fragment-processing)

## スライディングウィンドウの更新 {#sliding-window}

受信したデータグラムのシーケンス番号に基づいて、以下の処理を行います：

- スライディングウィンドウの更新
- 未受信データグラムのNAKキューへの追加
- 受信データグラムのACKキューへの追加

### 具体的な手順

1. 受信したデータグラムのシーケンス番号を確認します
2. 期待されるシーケンス番号との比較を行います
3. 必要に応じてNAKキューを更新します
4. ACKキューに受信したシーケンス番号を追加します

### コード例

```plaintext
// expected_sequence_number = 0

let skipped_count = 0
let received_sequence = データグラムのシーケンス番号

if received_sequence == expected_sequence_number
  expected_sequence_number += 1
else if received_sequence > expected_sequence_number
  skipped_count = received_sequence - expected_sequence_number
  expected_sequence_number = received_sequence + 1
else
  return  // 既に受信済みのデータグラム

// 未受信データグラムの処理
if skipped_count > 0
  for i in 0..skipped_count
    NAKキューに (expected_sequence_number + i) を追加

// 受信確認の処理
ACKキューに received_sequence を追加
```

### 重要なポイント

- データグラムの順序管理を行い、欠落を検出
- ACKによる受信確認
- 必要に応じてNAKによる再送要求

::: warning
この実装は公式のものと同じですが、通信に必要以上の遅延が発生する可能性があります。RTOを用いた最適化などで改善が可能です。
:::

## フラグメントの処理 {#fragment-processing}

データグラムからフラグメントを取り出して処理を行います。

### 具体的な手順

1. データグラム内のフラグメントを取得します
2. 信頼性がReliableの場合、専用のスライディングウィンドウを更新します
3. フラグメントが分割されている場合、それらを一時的に保存し、全てのフラグメントが揃った時に結合して処理を行います
4. 信頼性がSequencedの場合、最後に受信した`sequenced_index`以下の場合は、古いデータなので処理を終了します
5. 信頼性がOrderedの場合、順番通りに処理できる場合は通しますが、順番が飛んでいる場合はフラグメントを一時的に保存して後で順番が揃った時に処理します
6. フラグメントの`body`データを処理します

### 全体の流れ

処理が複雑で巨大なため、5つのステップに分けて説明します。

```plaintext
let fragments = データグラム内のフラグメント

for fragment in fragments
  /* 1 */
  if Reliable
    Reliableフラグメント用のスライディングウィンドウを更新する

  /* 2 */
  if fragment.is_split == true
    分割されたデータグラムのフラグメントを結合する
    パーツが足りない場合はここで処理を終了する

  /* 3 */
  if Sequenced
    最後にそのチャンネルで受信したindexより小さい場合は、古いデータなので処理を終了する
  /* 4 */
  else if Ordered
    順番通りに処理できる場合は通すが、順番が飛んでいる場合はフラグメントを一時的に保存して後で処理する

  /* 5 */
  bodyデータの処理
```

### 1.

信頼性がReliableのフラグメントは専用のスライディングウィンドウによって、既に受け取ったフラグメントの再受信を防ぎます。データグラム用のスライディングウィンドウとは違う実装なので、注意が必要です。

```plaintext
// base_reliable_index = 0
// reliable_index_queue = [null; 512]

if Reliable
  let relative_index = fragment.reliable_index - base_reliable_index

  if relative_index == 0
    reliable_index_queue[0] = null
    reliable_index_queue.rotate_left(1)
    base_reliable_index += 1
  else if relative_index < 0
    return
  else if reliable_index_queue[relative_index] == false
    return
  else if relative_index >= 512
    コネクションを切断する
  else
    reliable_index_queue[relative_index] = false
    
  let shift_count = 0

  for i in 0..512
    if reliable_index_queue[i] == null
      break
    else if reliable_index_queue[i] == false
      reliable_index_queue[i] = null
      shift_count++
    else
      break

  reliable_index_queue.rotate_left(shift_count)
  base_reliable_index += shift_count
```

このコードは、Reliableフラグメントの重複受信を防ぎ、順序を管理するスライディングウィンドウを実装しています。

#### 主要な変数

- `base_reliable_index`: スライディングウィンドウの開始位置を示すインデックス
- `reliable_index_queue`: 固定長(512)の配列。以下の値を持ちます
  - `null`: まだ受信していないフラグメント
  - `false`: 受信済みのフラグメント

#### 処理の流れ

1. 受信したフラグメントの相対的な位置（`relative_index`）を計算
2. フラグメントの状態に応じて処理：
   - 期待される次のフラグメント(`relative_index = 0`)の場合、ウィンドウを1つ進める
   - 既に受信済み(`relative_index < 0`)の場合、処理をスキップ
   - 重複フラグメント(`reliable_index_queue[relative_index] = false`)の場合、処理をスキップ
   - インデックスが範囲外(`relative_index >= 512`)の場合、接続を切断
   - それ以外の場合、フラグメントを受信済みとしてマーク
3. 連続して受信済みのフラグメントがある場合、ウィンドウをまとめて進める

#### 重要なポイント

- 重複受信を防止
- 未受信フラグメントの把握が容易

特に通信が不安定な環境では、このような順序管理が重要になります。未受信フラグメントが長時間続く場合は、接続の問題として扱う必要があります。

::: tip
ウィンドウのサイズは512にしなければいけないわけではありません。公式の実装では設定されていないようなものなので、ここでは512としています。
:::

### 2.

フラグメントが分割された物であれば、それらを一時的に保存します。全てのフラグメントが揃った場合は、フラグメントを結合して処理を行います。フラグメントが揃っていない場合は、ここで処理を終了します。

```plaintext
// split_fragments: Map<u16, [u8[]; split_size]> = new Map()

if fragment.is_split == true
  if fragment.split_idがsplit_fragmentsに存在しない
    let fragments = [null; fragment.split_size]
    fragments[fragment.split_index] = fragment.body
    split_fragments[fragment.split_id] = fragments

    return
  else
    split_fragments[fragment.split_id][fragment.split_index] = fragment.body

    if split_fragments[fragment.split_id].contains(null) == false
      let body = split_fragments[fragment.split_id].join()
      fragment.body = body
    else
      return
```

このコードは、分割されたフラグメントを結合して処理を行うための実装です。

#### 主要な変数

- `split_fragments`: 分割されたフラグメントのbodyを一時的に保存するためのマップ。キーは`split_id`、値は長さ`split_size`の配列

#### 処理の流れ

1. 分割されたフラグメントのbodyを一時的に保存
2. 全てのフラグメントが揃った場合、フラグメントを結合(fragment.bodyを結合したものに置き換え)
3. フラグメントが揃っていない場合、処理を終了

### 3.

フラグメントの信頼性がSequencedの場合、そのチャンネルで最後に受信した`sequenced_index`以下の場合は、古いフラグメントなので処理を終了します。

```plaintext
// highest_sequenced_index = [-1; 32]

if Sequenced
  if fragment.sequenced_index <= highest_sequenced_index[fragment.ordering_channel]
    return
  else
    highest_sequenced_index[fragment.ordering_channel] = fragment.sequenced_index
```

#### 主要な変数

- `highest_sequenced_index`: チャンネルごとに最後に受信した`sequenced_index`を保持する配列

#### 処理の流れ

1. チャンネルごとに最後に受信した`sequenced_index`を保持
2. 受信したフラグメントの`sequenced_index`が最後に受信した`sequenced_index`以下の場合、古いフラグメントなので処理を終了
3. それ以外の場合、最後に受信した`sequenced_index`を更新

### 4.

フラグメントの信頼性がOrderedの場合、順番通りに処理できる場合は通しますが、順番が飛んでいる場合はフラグメントを一時的に保存して順番が揃った時に処理します。

```plaintext
// expected_ordering_index = [0; 32]
// ordered_fragments: [{index: u8, body: u8[]}; 32] = []

if Ordered
  if fragment.ordering_index == expected_ordering_index[fragment.ordering_channel]
    expected_ordering_index[fragment.ordering_channel]++
    bodyデータの処理

    // indexを昇順にソート
    ordered_fragments[fragment.ordering_channel].sort_by(|a, b| a.index.cmp(&b.index))

    for ordered_fragment in ordered_fragments[fragment.ordering_channel]
      if ordered_fragment.index == expected_ordering_index[fragment.ordering_channel]
        expected_ordering_index[fragment.ordering_channel]++
        bodyデータの処理
      else
        break
  else
    ordered_fragments[fragment.ordering_channel].push({index: fragment.ordering_index, body: fragment.body})
```

このコードは、Orderedフラグメントの順序を管理し、順番が飛んでいる場合に一時的に保存するための実装です。

#### 主要な変数

- `expected_ordering_index`: チャンネルごとに期待される`ordering_index`を保持する配列
- `ordered_fragments`: チャンネルごとに順番が飛んだフラグメントを一時的に保存するための配列

#### 処理の流れ

1. チャンネルごとに期待される`ordering_index`を保持
2. 受信したフラグメントの`ordering_index`が期待される`ordering_index`と一致する場合、処理を行う
3. それ以外の場合、フラグメントを一時的に保存

#### 重要なポイント

- 順番が飛んだフラグメントを一時的に保存
- 順番が揃った時にまとめて処理

### 5.

フラグメントの`body`データを処理します。`body`=メッセージなので、コネクション確立前と同様にメッセージを処理します。

## 参考

- [受信処理](https://github.com/facebookarchive/RakNet/blob/master/Source/ReliabilityLayer.cpp#L635)
- [データグラム受信時のスライディングウィンドウの処理](https://github.com/facebookarchive/RakNet/blob/1a169895a900c9fc4841c556e16514182b75faf8/Source/CCRakNetSlidingWindow.cpp#L128)