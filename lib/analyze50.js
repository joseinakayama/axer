'use strict';
function analyze50($, url, html, allCSS, loadTime, contentLength, bodyText, bodyTextClean) {
  const items = [];

  // ヘルパー
  const hasKeyword = (text, keywords) => keywords.some(kw => text.includes(kw));
  const countKeywords = (text, keywords) => keywords.filter(kw => text.includes(kw)).length;

  // ===================
  // 全体（1-12）
  // ===================

  // 1. 表示速度
  {
    let score, detail;
    if (loadTime < 2000) {
      score = 2; detail = `${(loadTime / 1000).toFixed(1)}秒 - 良好な表示速度です`;
    } else if (loadTime < 4000) {
      score = 1; detail = `${(loadTime / 1000).toFixed(1)}秒 - やや遅めです。画像圧縮やキャッシュ設定を検討してください`;
    } else {
      score = 0; detail = `${(loadTime / 1000).toFixed(1)}秒 - 表示が遅いです。画像最適化、不要なスクリプト削除を行ってください`;
    }
    items.push({ num: 1, score, detail });
  }

  // 2. Googleマップ（ビジネスプロフィール埋め込み）
  {
    const mapIframes = $('iframe[src*="google.com/maps"], iframe[src*="maps.google"]');
    if (mapIframes.length > 0) {
      const src = mapIframes.first().attr('src') || '';
      if (src.includes('place') || src.includes('cid=') || src.includes('pb=')) {
        items.push({ num: 2, score: 2, detail: 'Googleビジネスプロフィールのマップ埋め込みを確認' });
      } else {
        items.push({ num: 2, score: 1, detail: 'Googleマップは埋め込まれていますが、住所検索型の可能性があります。Googleビジネスプロフィールの埋め込みに変更を推奨' });
      }
    } else {
      items.push({ num: 2, score: 0, detail: 'Googleマップの埋め込みが見つかりません' });
    }
  }

  // 3. SSL化
  {
    const isHTTPS = url.startsWith('https://');
    items.push({ num: 3, score: isHTTPS ? 2 : 0, detail: isHTTPS ? 'HTTPS（SSL）対応済み' : 'HTTPのままです。SSL化は必須です' });
  }

  // 4. ヘッダー追従
  {
    const headerEls = $('header, nav, .header, #header, .navbar, [role="banner"]');
    const hasStickyHeader = allCSS.match(/(?:header|nav|\.header|#header|\.navbar)[^}]*position\s*:\s*(?:sticky|fixed)/i)
      || html.match(/style="[^"]*position\s*:\s*(?:sticky|fixed)[^"]*"/i);
    const hasFixedNav = $('[style*="position:fixed"], [style*="position: fixed"], [style*="position:sticky"], [style*="position: sticky"]')
      .filter((_, el) => {
        const tag = el.tagName.toLowerCase();
        const cls = ($(el).attr('class') || '').toLowerCase();
        return tag === 'header' || tag === 'nav' || cls.includes('header') || cls.includes('nav');
      }).length > 0;

    if (hasStickyHeader || hasFixedNav) {
      items.push({ num: 4, score: 2, detail: 'ヘッダーが追従設定されています' });
    } else if (headerEls.length > 0) {
      items.push({ num: 4, score: 1, detail: 'ヘッダーは存在しますが、追従設定が検出されませんでした。CSSを目視確認してください' });
    } else {
      items.push({ num: 4, score: 0, detail: 'ヘッダー要素が見つかりません' });
    }
  }

  // 5. オリジナル画像素材
  {
    const images = $('img');
    const stockDomains = ['unsplash', 'shutterstock', 'istockphoto', 'pixabay', 'pexels', 'stock.adobe', 'freepik', 'photoac', 'photo-ac', 'pakutaso', 'o-dan', 'busitry-photo', 'girlydrop', 'pixta'];
    let stockCount = 0;
    let totalImg = images.length;
    images.each((_, el) => {
      const src = ($(el).attr('src') || '').toLowerCase();
      if (stockDomains.some(d => src.includes(d))) stockCount++;
    });

    if (totalImg === 0) {
      items.push({ num: 5, score: 0, detail: '画像が見つかりません。オリジナル画像の使用を推奨します' });
    } else if (stockCount === 0) {
      items.push({ num: 5, score: 2, detail: `${totalImg}枚の画像 - フリー素材サイトからの画像は検出されませんでした` });
    } else {
      items.push({ num: 5, score: 1, detail: `${totalImg}枚中${stockCount}枚がフリー素材の可能性。オリジナル画像への差し替えを推奨` });
    }
  }

  // 6. 流し読みでも理解できる図や画像
  {
    const imgCount = $('img, svg, figure, picture, video').length;
    const textLen = bodyTextClean.length;
    const imgPer1000 = textLen > 0 ? (imgCount / (textLen / 1000)) : 0;

    if (imgCount >= 5 && imgPer1000 >= 1) {
      items.push({ num: 6, score: 2, detail: `画像/図: ${imgCount}個 - テキストに対して十分なビジュアルがあります` });
    } else if (imgCount >= 2) {
      items.push({ num: 6, score: 1, detail: `画像/図: ${imgCount}個 - もう少しビジュアルを増やすと流し読みでも理解しやすくなります` });
    } else {
      items.push({ num: 6, score: 0, detail: `画像/図: ${imgCount}個 - ビジュアルが不足しています。図解やイメージ画像を追加してください` });
    }
  }

  // 7. 1文1文が長すぎないか
  {
    const sentences = bodyText.split(/[。！？\n]/).filter(s => s.trim().length > 5);
    if (sentences.length > 0) {
      const avgLen = sentences.reduce((sum, s) => sum + s.trim().length, 0) / sentences.length;
      const longSentences = sentences.filter(s => s.trim().length > 80).length;
      if (avgLen <= 50 && longSentences <= sentences.length * 0.1) {
        items.push({ num: 7, score: 2, detail: `平均文長: ${Math.round(avgLen)}文字 - 読みやすい文章量です` });
      } else if (avgLen <= 80) {
        items.push({ num: 7, score: 1, detail: `平均文長: ${Math.round(avgLen)}文字 - やや長めの文があります（80文字超: ${longSentences}文）` });
      } else {
        items.push({ num: 7, score: 0, detail: `平均文長: ${Math.round(avgLen)}文字 - 文章が長すぎます。1文を短く切りましょう` });
      }
    } else {
      items.push({ num: 7, score: null, detail: '文章が少なすぎて判定できません' });
    }
  }

  // 8. わかりにくい専門用語
  {
    items.push({ num: 8, score: null, detail: '【目視確認が必要】専門用語の多さはターゲット層に依存するため、自動判定ができません' });
  }

  // 9. OGP設定
  {
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogDesc = $('meta[property="og:description"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    const ogCount = [ogTitle, ogDesc, ogImage].filter(Boolean).length;
    if (ogCount === 3) {
      items.push({ num: 9, score: 2, detail: 'OGP完全設定済み（og:title, og:description, og:image）' });
    } else if (ogCount >= 1) {
      const missing = [];
      if (!ogTitle) missing.push('og:title');
      if (!ogDesc) missing.push('og:description');
      if (!ogImage) missing.push('og:image');
      items.push({ num: 9, score: 1, detail: `OGP一部設定。未設定: ${missing.join(', ')}` });
    } else {
      items.push({ num: 9, score: 0, detail: 'OGPが設定されていません。SNSシェア時に表示が崩れます' });
    }
  }

  // 10. フローティングボタン
  {
    const ctaKeywords = ['問い合わせ', '相談', '申し込', '予約', '資料', '見積', '無料', 'contact', 'LINE', '電話'];
    // CSSでposition:fixedを持つ要素を検索
    const fixedEls = $('[style*="position:fixed"], [style*="position: fixed"]');
    let hasFloatingCTA = false;

    fixedEls.each((_, el) => {
      const text = $(el).text().toLowerCase();
      if (ctaKeywords.some(kw => text.includes(kw.toLowerCase()))) hasFloatingCTA = true;
    });

    // CSSクラスベースのチェック
    if (!hasFloatingCTA) {
      const fixedClassPattern = /\.([\w-]+)[^}]*position\s*:\s*fixed/gi;
      let match;
      while ((match = fixedClassPattern.exec(allCSS)) !== null) {
        const cls = match[1];
        const els = $(`.${cls}`);
        els.each((_, el) => {
          const text = $(el).text().toLowerCase();
          if (ctaKeywords.some(kw => text.includes(kw.toLowerCase()))) hasFloatingCTA = true;
        });
      }
    }

    if (hasFloatingCTA) {
      items.push({ num: 10, score: 2, detail: 'フローティングCTAボタンを検出' });
    } else {
      // fixedポジションの要素自体はあるか
      const anyFixed = allCSS.includes('position:fixed') || allCSS.includes('position: fixed') || fixedEls.length > 0;
      if (anyFixed) {
        items.push({ num: 10, score: 1, detail: '固定要素はありますが、CTA用のフローティングボタンか目視確認してください' });
      } else {
        items.push({ num: 10, score: 0, detail: 'フローティングボタンが見つかりません。スクロール追従型のCTAボタンを設置しましょう' });
      }
    }
  }

  // 11. お問い合わせページ遷移のしやすさ
  {
    const contactKeywords = ['contact', 'inquiry', 'form', '問い合わせ', '相談', '申込'];
    const header = $('header, nav, .header, #header, .navbar');
    const footer = $('footer, .footer, #footer');

    const headerContactLinks = header.find('a').filter((_, el) => {
      const href = ($(el).attr('href') || '').toLowerCase();
      const text = $(el).text().toLowerCase();
      return contactKeywords.some(kw => href.includes(kw) || text.includes(kw));
    }).length;

    const footerContactLinks = footer.find('a').filter((_, el) => {
      const href = ($(el).attr('href') || '').toLowerCase();
      const text = $(el).text().toLowerCase();
      return contactKeywords.some(kw => href.includes(kw) || text.includes(kw));
    }).length;

    if (headerContactLinks > 0 && footerContactLinks > 0) {
      items.push({ num: 11, score: 2, detail: 'ヘッダー・フッター両方に問い合わせ導線あり' });
    } else if (headerContactLinks > 0 || footerContactLinks > 0) {
      items.push({ num: 11, score: 1, detail: `${headerContactLinks > 0 ? 'ヘッダー' : 'フッター'}に問い合わせリンクあり。両方に配置するとより効果的です` });
    } else {
      // ページ全体で探す
      const anyContact = $('a').filter((_, el) => {
        const href = ($(el).attr('href') || '').toLowerCase();
        const text = $(el).text().toLowerCase();
        return contactKeywords.some(kw => href.includes(kw) || text.includes(kw));
      }).length;
      if (anyContact > 0) {
        items.push({ num: 11, score: 1, detail: 'ページ内に問い合わせリンクはありますが、ヘッダー/フッターへの配置を推奨' });
      } else {
        items.push({ num: 11, score: 0, detail: '問い合わせへの導線が見つかりません' });
      }
    }
  }

  // 12. 全体の情報量
  {
    const len = bodyTextClean.length;
    if (len >= 3000) {
      items.push({ num: 12, score: 2, detail: `テキスト量: 約${Math.round(len / 100) * 100}文字 - 十分な情報量です` });
    } else if (len >= 1000) {
      items.push({ num: 12, score: 1, detail: `テキスト量: 約${Math.round(len / 100) * 100}文字 - やや少なめです。情報を充実させましょう` });
    } else {
      items.push({ num: 12, score: 0, detail: `テキスト量: 約${len}文字 - 情報量が不足しています` });
    }
  }

  // ===================
  // デザイン（13-17）
  // ===================

  // 13. 色を多用していないか
  {
    const colorPattern = /#(?:[0-9a-fA-F]{3}){1,2}\b|rgba?\([^)]+\)|hsla?\([^)]+\)/g;
    const colors = new Set();
    const matches = allCSS.match(colorPattern) || [];
    matches.forEach(c => {
      // 正規化して近い色をグループ化（簡易）
      const normalized = c.toLowerCase().replace(/\s/g, '');
      colors.add(normalized);
    });
    // インライン スタイルの色も
    $('[style]').each((_, el) => {
      const style = $(el).attr('style') || '';
      const inlineColors = style.match(colorPattern) || [];
      inlineColors.forEach(c => colors.add(c.toLowerCase().replace(/\s/g, '')));
    });

    const uniqueCount = colors.size;
    if (uniqueCount <= 5) {
      items.push({ num: 13, score: 2, detail: `使用色数: 約${uniqueCount}色 - 適切にまとまっています` });
    } else if (uniqueCount <= 10) {
      items.push({ num: 13, score: 1, detail: `使用色数: 約${uniqueCount}色 - やや多めです。メイン3色に絞ることを推奨` });
    } else {
      items.push({ num: 13, score: 0, detail: `使用色数: 約${uniqueCount}色 - 色が多すぎます。3色以内に統一しましょう` });
    }
  }

  // 14. 文字装飾ルールが統一されているか
  {
    items.push({ num: 14, score: null, detail: '【目視確認が必要】文字装飾の統一性は目視での判断が必要です' });
  }

  // 15. 適切な文字の大きさ
  {
    const fontSizePattern = /font-size\s*:\s*(\d+(?:\.\d+)?)\s*px/gi;
    const sizes = [];
    let match;
    while ((match = fontSizePattern.exec(allCSS)) !== null) {
      sizes.push(parseFloat(match[1]));
    }
    // body/html/pの基本サイズを探す
    const bodyFontMatch = allCSS.match(/(?:body|html|p)\s*\{[^}]*font-size\s*:\s*(\d+(?:\.\d+)?)\s*px/i);
    const baseSize = bodyFontMatch ? parseFloat(bodyFontMatch[1]) : null;

    if (baseSize) {
      if (baseSize >= 14 && baseSize <= 16) {
        items.push({ num: 15, score: 2, detail: `基本文字サイズ: ${baseSize}px - 読みやすいサイズです` });
      } else if (baseSize >= 12 && baseSize <= 18) {
        items.push({ num: 15, score: 1, detail: `基本文字サイズ: ${baseSize}px - 14〜16pxが最適です` });
      } else {
        items.push({ num: 15, score: 0, detail: `基本文字サイズ: ${baseSize}px - 読みにくいサイズです。14〜16pxを推奨` });
      }
    } else if (sizes.length > 0) {
      const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
      items.push({ num: 15, score: 1, detail: `基本文字サイズの明示的な指定が見つかりません（検出サイズ平均: ${Math.round(avg)}px）。目視確認してください` });
    } else {
      items.push({ num: 15, score: 1, detail: 'CSSで文字サイズの指定が検出できませんでした。ブラウザデフォルト（16px）の可能性があります' });
    }
  }

  // 16. スマホ対応
  {
    const hasViewport = $('meta[name="viewport"]').length > 0;
    const hasMediaQuery = allCSS.includes('@media');
    const hasResponsiveFramework = html.includes('bootstrap') || html.includes('tailwind') || allCSS.includes('flex') || allCSS.includes('grid');

    if (hasViewport && (hasMediaQuery || hasResponsiveFramework)) {
      items.push({ num: 16, score: 2, detail: 'viewport設定あり + レスポンシブCSS検出 - スマホ対応済み' });
    } else if (hasViewport) {
      items.push({ num: 16, score: 1, detail: 'viewport設定はありますが、レスポンシブCSSの検出が限定的です。実機確認を推奨' });
    } else {
      items.push({ num: 16, score: 0, detail: 'viewport未設定 - スマホ対応ができていません' });
    }
  }

  // 17. コントラスト（抑揚）
  {
    const strongCount = $('strong, b').length;
    const emCount = $('em, i').length;
    const largeText = $('span[style*="font-size"], span[style*="font-weight"], .highlight, .emphasis, .large').length;
    const total = strongCount + emCount + largeText;

    if (total >= 5) {
      items.push({ num: 17, score: 2, detail: `文字装飾(太字/強調): ${total}箇所 - 適度な抑揚があります` });
    } else if (total >= 2) {
      items.push({ num: 17, score: 1, detail: `文字装飾: ${total}箇所 - もう少し重要部分を強調すると流し読みしやすくなります` });
    } else {
      items.push({ num: 17, score: 0, detail: `文字装飾: ${total}箇所 - 重要な文章に太字や色の変化をつけましょう` });
    }
  }

  // ===================
  // ファーストビュー（18-21）
  // ===================

  // 18. ベネフィットを入れているか
  {
    const benefitKeywords = ['実現', '解決', '改善', '向上', '削減', '最短', '最大', '確実', 'アップ', '倍', '万円', '時間', '売上', '集客', '成果', '結果', '変わる', '叶え', '手に入'];
    const h1Text = $('h1').first().text();
    // ファーストビュー（最初のセクション）のテキスト
    const firstSection = $('header, .hero, .mv, .fv, .firstview, .main-visual, section').first().text() || $('body').children().first().text();

    const h1HasBenefit = hasKeyword(h1Text, benefitKeywords);
    const fvHasBenefit = hasKeyword(firstSection, benefitKeywords);

    if (h1HasBenefit) {
      items.push({ num: 18, score: 2, detail: 'H1/メインコピーにベネフィット表現を検出' });
    } else if (fvHasBenefit || hasKeyword(bodyText, benefitKeywords)) {
      items.push({ num: 18, score: 1, detail: 'ベネフィット表現はありますが、ファーストビューでの訴求を強化しましょう' });
    } else {
      items.push({ num: 18, score: 0, detail: 'ベネフィット表現が見つかりません。「メリット」ではなく「顧客が得られる成果」を訴求しましょう' });
    }
  }

  // 19. ターゲットが明確か
  {
    const targetKeywords = ['の方', 'ための', '向け', '専門', '限定', '中小', '個人', '法人', '経営者', '担当者', 'ママ', '女性', '男性', '初心者', '初めて', '悩み', '困って'];
    const h1Text = $('h1').first().text();
    const fvText = ($('.hero, .mv, .fv, .firstview, .main-visual').first().text() || h1Text || '').slice(0, 500);

    if (hasKeyword(h1Text, targetKeywords) || hasKeyword(fvText, targetKeywords)) {
      items.push({ num: 19, score: 2, detail: 'ファーストビューにターゲット層を示す表現を検出' });
    } else if (hasKeyword(bodyText, targetKeywords)) {
      items.push({ num: 19, score: 1, detail: 'ターゲット表現はページ内にありますが、ファーストビューで即座に伝えましょう' });
    } else {
      items.push({ num: 19, score: 0, detail: 'ターゲット層が不明確です。「〇〇の方へ」「〇〇でお悩みの方」などを追加しましょう' });
    }
  }

  // 20. 他社との違いが瞬時にわかるコピー
  {
    const diffKeywords = ['唯一', '独自', '当社だけ', '他社にない', '業界初', '特許', 'オリジナル', '初めて', 'No.1', 'ナンバーワン', '日本初', '地域初', '圧倒的'];
    const h1Text = $('h1').first().text();
    const h2Texts = $('h2').map((_, el) => $(el).text()).get().join(' ');

    if (hasKeyword(h1Text, diffKeywords)) {
      items.push({ num: 20, score: 2, detail: 'メインコピーに差別化表現を検出' });
    } else if (hasKeyword(h2Texts, diffKeywords) || hasKeyword(bodyText.slice(0, 2000), diffKeywords)) {
      items.push({ num: 20, score: 1, detail: '差別化表現はありますが、ファーストビューで瞬時に伝えるとより効果的です' });
    } else {
      items.push({ num: 20, score: 0, detail: '他社との違いが見つかりません。USP（独自の強み）をコピーに入れましょう' });
    }
  }

  // 21. 信用できるコンテンツ
  {
    const trustKeywords = ['実績', '導入', '件', '社', '万', '以上', '突破', '受賞', 'No.1', '満足度', '紹介', 'メディア', '掲載', '認定', '年', '周年', '品質'];
    const fvArea = bodyText.slice(0, 2000);
    const trustCount = countKeywords(fvArea, trustKeywords);

    if (trustCount >= 3) {
      items.push({ num: 21, score: 2, detail: `信頼性コンテンツ: ${trustCount}個の信頼シグナルを検出` });
    } else if (trustCount >= 1) {
      items.push({ num: 21, score: 1, detail: `信頼性コンテンツが限定的です（${trustCount}個）。実績数値や受賞歴を追加しましょう` });
    } else {
      items.push({ num: 21, score: 0, detail: '信用できるコンテンツ（実績・受賞・メディア掲載等）が見つかりません' });
    }
  }

  // ===================
  // SEO対策（22-32）
  // ===================

  // 22. Alt タグ
  {
    const images = $('img');
    const withAlt = $('img[alt]').filter((_, el) => $(el).attr('alt').trim() !== '');
    const total = images.length;
    if (total === 0) {
      items.push({ num: 22, score: 1, detail: '画像が見つかりません' });
    } else {
      const rate = withAlt.length / total;
      if (rate >= 0.9) {
        items.push({ num: 22, score: 2, detail: `${total}枚中${withAlt.length}枚にalt設定済み（${Math.round(rate * 100)}%）` });
      } else if (rate >= 0.5) {
        items.push({ num: 22, score: 1, detail: `${total}枚中${withAlt.length}枚にalt設定（${Math.round(rate * 100)}%）- 全画像に設定しましょう` });
      } else {
        items.push({ num: 22, score: 0, detail: `${total}枚中${withAlt.length}枚のみalt設定（${Math.round(rate * 100)}%）- SEOとアクセシビリティに悪影響` });
      }
    }
  }

  // 23. タイトル
  {
    const title = $('title').text().trim();
    if (title && title.length >= 20 && title.length <= 60) {
      items.push({ num: 23, score: 2, detail: `「${title}」（${title.length}文字）- 適切です` });
    } else if (title) {
      items.push({ num: 23, score: 1, detail: `「${title}」（${title.length}文字）- ${title.length < 20 ? '短すぎます。20〜60文字推奨' : '長すぎます。60文字以内推奨'}` });
    } else {
      items.push({ num: 23, score: 0, detail: 'タイトルタグが未設定です' });
    }
  }

  // 24. ディスクリプション
  {
    const desc = ($('meta[name="description"]').attr('content') || '').trim();
    if (desc && desc.length >= 70 && desc.length <= 160) {
      items.push({ num: 24, score: 2, detail: `${desc.length}文字 - 適切な長さです` });
    } else if (desc) {
      items.push({ num: 24, score: 1, detail: `${desc.length}文字 - ${desc.length < 70 ? '短すぎます。70〜160文字推奨' : '長すぎます。160文字以内推奨'}` });
    } else {
      items.push({ num: 24, score: 0, detail: 'メタディスクリプションが未設定です' });
    }
  }

  // 25. 内部リンク
  {
    const parsedUrl = new URL(url);
    const internalLinks = $('a[href]').filter((_, el) => {
      const href = $(el).attr('href') || '';
      if (href.startsWith('/') && !href.startsWith('//')) return true;
      try {
        const linkUrl = new URL(href, url);
        return linkUrl.hostname === parsedUrl.hostname;
      } catch { return false; }
    });
    const count = internalLinks.length;
    if (count >= 10) {
      items.push({ num: 25, score: 2, detail: `内部リンク: ${count}個 - 十分な回遊設計です` });
    } else if (count >= 3) {
      items.push({ num: 25, score: 1, detail: `内部リンク: ${count}個 - もう少し増やすとSEO効果が上がります` });
    } else {
      items.push({ num: 25, score: 0, detail: `内部リンク: ${count}個 - 不足しています。関連ページへのリンクを追加しましょう` });
    }
  }

  // 26. ディレクトリ構造
  {
    const parsedUrl = new URL(url);
    const pathDepth = parsedUrl.pathname.split('/').filter(Boolean).length;
    const hasCleanUrl = !parsedUrl.pathname.includes('?') && !parsedUrl.pathname.match(/\.\w{3,4}$/);

    // サイト内リンクのURL構造もチェック
    const internalPaths = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (href.startsWith('/') && !href.startsWith('//')) internalPaths.push(href);
    });
    const deepPaths = internalPaths.filter(p => p.split('/').filter(Boolean).length > 4).length;

    if (hasCleanUrl && deepPaths === 0) {
      items.push({ num: 26, score: 2, detail: 'URLが整理されており、ディレクトリ構造が適切です' });
    } else if (deepPaths <= internalPaths.length * 0.2) {
      items.push({ num: 26, score: 1, detail: '概ね問題ありませんが、一部深い階層のURLがあります' });
    } else {
      items.push({ num: 26, score: 0, detail: 'ディレクトリ構造が深すぎるURLが多いです。3階層以内を推奨' });
    }
  }

  // 27. ページ更新頻度
  {
    items.push({ num: 27, score: null, detail: '【目視確認が必要】更新頻度は外部データが必要なため自動判定できません。Google Search Consoleで確認してください' });
  }

  // 28. ドメインパワー
  {
    items.push({ num: 28, score: null, detail: '【目視確認が必要】ドメインパワーはMoz, Ahrefs等の外部ツールで確認してください' });
  }

  // 29. 他ページキーワード上位表示
  {
    items.push({ num: 29, score: null, detail: '【目視確認が必要】キーワードの検索順位はSearch Console等で確認してください' });
  }

  // 30. Hタグ構造
  {
    const h1s = $('h1');
    const h2s = $('h2');
    const h3s = $('h3');

    // 階層の飛びをチェック（h1→h3のようにh2を飛ばしていないか）
    let hierarchyOk = true;
    const headings = $('h1, h2, h3, h4, h5, h6');
    let prevLevel = 0;
    headings.each((_, el) => {
      const level = parseInt(el.tagName[1]);
      if (prevLevel > 0 && level > prevLevel + 1) hierarchyOk = false;
      prevLevel = level;
    });

    if (h1s.length === 1 && h2s.length >= 2 && hierarchyOk) {
      items.push({ num: 30, score: 2, detail: `H1:${h1s.length}, H2:${h2s.length}, H3:${h3s.length} - 適切な見出し構造です` });
    } else if (h1s.length >= 1 && h2s.length >= 1) {
      const issues = [];
      if (h1s.length > 1) issues.push(`H1が${h1s.length}個（1個推奨）`);
      if (!hierarchyOk) issues.push('見出し階層の飛びあり');
      items.push({ num: 30, score: 1, detail: `H1:${h1s.length}, H2:${h2s.length}, H3:${h3s.length} - ${issues.join('、')}` });
    } else {
      items.push({ num: 30, score: 0, detail: `H1:${h1s.length}, H2:${h2s.length} - 見出し構造が不適切です` });
    }
  }

  // 31. インデックス数
  {
    items.push({ num: 31, score: null, detail: '【目視確認が必要】「site:ドメイン名」でGoogle検索して確認してください' });
  }

  // 32. パンくずリスト
  {
    const hasBreadcrumbSchema = $('script[type="application/ld+json"]').filter((_, el) => {
      const text = $(el).html() || '';
      return text.includes('BreadcrumbList');
    }).length > 0;
    const hasBreadcrumbNav = $('nav[aria-label*="breadcrumb"], .breadcrumb, .breadcrumbs, [class*="pankuzu"], [class*="topicpath"]').length > 0;
    const hasBreadcrumbText = bodyText.includes('ホーム') && (bodyText.includes('＞') || bodyText.includes('>') || bodyText.includes('›'));

    if (hasBreadcrumbSchema || hasBreadcrumbNav) {
      items.push({ num: 32, score: 2, detail: 'パンくずリストを検出' });
    } else if (hasBreadcrumbText) {
      items.push({ num: 32, score: 1, detail: 'パンくずリストらしき要素がありますが、構造化データの追加を推奨' });
    } else {
      items.push({ num: 32, score: 0, detail: 'パンくずリストが見つかりません。ユーザビリティとSEOのために追加しましょう' });
    }
  }

  // ===================
  // 各ページコンテンツ（33-40）
  // ===================

  // 33. サービス説明の詳細
  {
    const serviceKeywords = ['サービス', 'プラン', '特徴', '機能', 'できること', '提供', 'ソリューション', '商品', '製品'];
    const serviceHeadings = $('h2, h3').filter((_, el) => hasKeyword($(el).text(), serviceKeywords)).length;
    const textLen = bodyTextClean.length;

    if (serviceHeadings >= 2 && textLen >= 2000) {
      items.push({ num: 33, score: 2, detail: `サービス関連の見出し: ${serviceHeadings}個 - 詳細な説明があります` });
    } else if (serviceHeadings >= 1 || textLen >= 1500) {
      items.push({ num: 33, score: 1, detail: 'サービス説明はありますが、より詳細な情報を追加すると効果的です' });
    } else {
      items.push({ num: 33, score: 0, detail: 'サービスの詳細説明が不足しています' });
    }
  }

  // 34. ストーリー
  {
    const storyKeywords = ['ストーリー', '想い', '思い', 'きっかけ', '創業', '原点', '歴史', '沿革', 'なぜ', '理念', 'ビジョン', '使命', 'ミッション', '誕生'];
    if (hasKeyword(bodyText, storyKeywords)) {
      items.push({ num: 34, score: 2, detail: 'ストーリー性のあるコンテンツを検出' });
    } else {
      items.push({ num: 34, score: 1, detail: 'ストーリー性のあるコンテンツが見つかりません。創業の想いや理念を伝えると共感を得やすくなります' });
    }
  }

  // 35. 事例やお客様の声
  {
    const voiceKeywords = ['お客様の声', 'お客さまの声', '導入事例', '事例紹介', 'レビュー', '口コミ', '体験談', '感想', 'voice', 'review', 'testimonial', 'case study', '成功事例', 'ケーススタディ'];
    const voiceHeadings = $('h2, h3').filter((_, el) => hasKeyword($(el).text().toLowerCase(), voiceKeywords.map(k => k.toLowerCase()))).length;

    if (voiceHeadings >= 1) {
      items.push({ num: 35, score: 2, detail: 'お客様の声/事例セクションを検出' });
    } else if (hasKeyword(bodyText.toLowerCase(), voiceKeywords.map(k => k.toLowerCase()))) {
      items.push({ num: 35, score: 1, detail: '事例やお客様の声の記述はありますが、専用セクションを設けるとより効果的です' });
    } else {
      items.push({ num: 35, score: 0, detail: '事例やお客様の声が見つかりません。最低3件以上の掲載を推奨' });
    }
  }

  // 36. 証拠の信憑性・具体性
  {
    // 写真付きレビュー、実名、具体的数値があるかチェック
    const credibilityKeywords = ['様', '氏', '代表', '社長', '担当', '歳', '代', '男性', '女性', '写真', '動画', '取材'];
    const voiceSection = bodyText;
    const hasSpecificVoice = countKeywords(voiceSection, credibilityKeywords) >= 3;

    // レビュー近くに画像があるか
    const reviewSections = $('h2:contains("お客様"), h2:contains("事例"), h2:contains("声"), .review, .testimonial, .voice');
    let hasImageNearReview = false;
    reviewSections.each((_, el) => {
      const next = $(el).nextAll().slice(0, 5);
      if (next.find('img').length > 0 || next.filter('img').length > 0) hasImageNearReview = true;
    });

    if (hasSpecificVoice && hasImageNearReview) {
      items.push({ num: 36, score: 2, detail: '具体性のある証拠（写真・実名等）を検出' });
    } else if (hasSpecificVoice || hasImageNearReview) {
      items.push({ num: 36, score: 1, detail: '証拠はありますが、写真+実名+具体的な成果数値でより信憑性が高まります' });
    } else {
      items.push({ num: 36, score: null, detail: '【目視確認推奨】お客様の声の信憑性（写真・実名・具体的数値の有無）を確認してください' });
    }
  }

  // 37. 他社との違いが明確か
  {
    const comparisonKeywords = ['比較', '他社', '違い', '差別化', '選ばれる理由', '強み', '当社の特徴', '当社だけ', '競合', 'vs'];
    const hasComparisonTable = $('table').filter((_, el) => hasKeyword($(el).text(), comparisonKeywords)).length > 0;
    const hasComparisonSection = $('h2, h3').filter((_, el) => hasKeyword($(el).text(), comparisonKeywords)).length > 0;

    if (hasComparisonTable || hasComparisonSection) {
      items.push({ num: 37, score: 2, detail: '他社比較/差別化セクションを検出' });
    } else if (hasKeyword(bodyText, comparisonKeywords)) {
      items.push({ num: 37, score: 1, detail: '差別化の記述はありますが、比較表や専用セクションがあるとより明確になります' });
    } else {
      items.push({ num: 37, score: 0, detail: '他社との違いが明確でありません。比較表や「選ばれる理由」セクションを追加しましょう' });
    }
  }

  // 38. 価格を明記しているか
  {
    const priceKeywords = ['料金', '価格', 'プラン', '費用', 'price', '円', '¥', '税込', '税別', '月額', '年額', '無料'];
    const priceHeading = $('h2, h3').filter((_, el) => hasKeyword($(el).text(), priceKeywords)).length > 0;
    const hasPrice = hasKeyword(bodyText, priceKeywords);

    if (priceHeading) {
      items.push({ num: 38, score: 2, detail: '料金セクションを検出' });
    } else if (hasPrice) {
      items.push({ num: 38, score: 1, detail: '料金に関する記述はありますが、明確な料金表の設置を推奨' });
    } else {
      items.push({ num: 38, score: 0, detail: '料金情報が見つかりません。見積もりフォームや料金目安を掲載しましょう' });
    }
  }

  // 39. サービス提供の流れ
  {
    const flowKeywords = ['流れ', 'ステップ', 'STEP', 'step', '手順', 'ご利用方法', '導入の流れ', 'ご注文の流れ', 'ご利用の流れ', 'お申し込みの流れ'];
    const flowHeading = $('h2, h3').filter((_, el) => hasKeyword($(el).text(), flowKeywords)).length > 0;

    if (flowHeading) {
      items.push({ num: 39, score: 2, detail: 'サービス提供の流れセクションを検出' });
    } else if (hasKeyword(bodyText, flowKeywords)) {
      items.push({ num: 39, score: 1, detail: '流れに関する記述はありますが、見出し付きの専用セクションにするとわかりやすくなります' });
    } else {
      items.push({ num: 39, score: 0, detail: 'サービス提供の流れが見つかりません。STEP形式で追加しましょう' });
    }
  }

  // 40. FAQ
  {
    const faqKeywords = ['よくある質問', 'FAQ', 'Q&A', 'よくあるご質問', 'ご質問'];
    const faqSchema = $('script[type="application/ld+json"]').filter((_, el) => ($(el).html() || '').includes('FAQPage')).length > 0;
    const faqHeading = $('h2, h3').filter((_, el) => hasKeyword($(el).text(), faqKeywords)).length > 0;

    if (faqSchema && faqHeading) {
      items.push({ num: 40, score: 2, detail: 'FAQセクション + 構造化データを検出' });
    } else if (faqHeading || hasKeyword(bodyText, faqKeywords)) {
      items.push({ num: 40, score: 2, detail: 'FAQセクションを検出' });
    } else {
      items.push({ num: 40, score: 0, detail: 'FAQが見つかりません。ユーザーの疑問を5〜10個まとめましょう' });
    }
  }

  // ===================
  // クロージング（41-45）
  // ===================

  // 41. 次の行動が具体的か
  {
    const specificCTA = ['LINEで', '電話で', 'メールで', 'フォームから', '今すぐ', 'こちらから', 'ボタンを押して', 'クリック', '入力', '送信', '申し込む', '予約する', '登録する', 'ダウンロード'];
    const ctaTexts = [];
    $('a, button').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 0 && text.length < 50) ctaTexts.push(text);
    });
    const specificCount = ctaTexts.filter(t => hasKeyword(t, specificCTA)).length;

    if (specificCount >= 2) {
      items.push({ num: 41, score: 2, detail: `具体的なCTA表現: ${specificCount}個検出` });
    } else if (specificCount >= 1) {
      items.push({ num: 41, score: 1, detail: 'CTAはありますが、より具体的な行動指示を追加しましょう' });
    } else {
      items.push({ num: 41, score: 0, detail: '具体的な行動指示が見つかりません。「LINEから無料相談する」など具体的なCTAを設置しましょう' });
    }
  }

  // 42. CTAボタンが目立つか
  {
    const ctaKeywords = ['問い合わせ', '相談', '申し込', '予約', '資料', '無料', '体験', 'contact', '見積', '購入', '注文', '登録'];
    const ctaButtons = $('a, button').filter((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      return ctaKeywords.some(kw => text.includes(kw));
    });

    if (ctaButtons.length >= 3) {
      items.push({ num: 42, score: 2, detail: `CTAボタン: ${ctaButtons.length}個検出 - 複数箇所に設置されています` });
    } else if (ctaButtons.length >= 1) {
      items.push({ num: 42, score: 1, detail: `CTAボタン: ${ctaButtons.length}個 - 各セクションの終わりにも配置するとより効果的です` });
    } else {
      items.push({ num: 42, score: 0, detail: 'CTAボタンが見つかりません。目立つ色とサイズで設置してください' });
    }
  }

  // 43. 行動を起こした先の未来
  {
    const afterActionKeywords = ['以内に', '営業日', '返信', '折り返し', '受付完了', '届きます', '送られます', '入金確認', '次のステップ', '担当者から', 'お届け', '登録完了'];
    if (hasKeyword(bodyText, afterActionKeywords)) {
      items.push({ num: 43, score: 2, detail: '行動後の流れ（返信時間等）の記載を検出' });
    } else {
      items.push({ num: 43, score: 0, detail: '行動後にどうなるか（例: ◯営業日以内に連絡）の記載がありません' });
    }
  }

  // 44. 心理的負担の軽減
  {
    const easeKeywords = ['簡単', 'カンタン', '30秒', '1分', '無料', '会員登録不要', 'たったの', '気軽', 'お気軽', '安心', 'いつでもキャンセル', '解約自由', 'ノーリスク', '返金保証', 'まずは', 'お試し', 'STEP'];
    const easeCount = countKeywords(bodyText, easeKeywords);

    if (easeCount >= 3) {
      items.push({ num: 44, score: 2, detail: `心理ハードル軽減の表現: ${easeCount}個検出` });
    } else if (easeCount >= 1) {
      items.push({ num: 44, score: 1, detail: `ハードル軽減表現あり（${easeCount}個）。「30秒で完了」「会員登録不要」等を追加するとさらに効果的` });
    } else {
      items.push({ num: 44, score: 0, detail: '心理的負担を軽減する表現がありません。「無料」「簡単」「お気軽に」等を追加しましょう' });
    }
  }

  // 45. 営業日・営業時間
  {
    const hoursKeywords = ['営業時間', '営業日', '受付時間', '対応時間', '定休日', '年中無休', '24時間', '平日', '土日', '祝日', '〜時', '時〜', 'AM', 'PM', '9:00', '10:00', '18:00', '19:00', '20:00'];
    if (hasKeyword(bodyText, hoursKeywords)) {
      items.push({ num: 45, score: 2, detail: '営業時間/受付時間の記載を検出' });
    } else {
      items.push({ num: 45, score: 0, detail: '営業時間・対応時間の記載がありません。CTA付近に記載するとCV率が上がります' });
    }
  }

  // ===================
  // 透明性（46-48）
  // ===================

  // 46. サービス提供者の画像
  {
    const personKeywords = ['代表', 'スタッフ', '担当', 'メンバー', 'チーム', 'プロフィール', '紹介', 'about', 'greeting', '挨拶', '写真'];
    const personSection = $('h2, h3').filter((_, el) => hasKeyword($(el).text().toLowerCase(), personKeywords.map(k => k.toLowerCase()))).length > 0;

    // 人物画像の存在を推定
    const personImages = $('img').filter((_, el) => {
      const alt = ($(el).attr('alt') || '').toLowerCase();
      const src = ($(el).attr('src') || '').toLowerCase();
      return personKeywords.some(kw => alt.includes(kw.toLowerCase()) || src.includes(kw.toLowerCase()));
    }).length;

    if (personSection && personImages > 0) {
      items.push({ num: 46, score: 2, detail: 'スタッフ/代表者の画像付きセクションを検出' });
    } else if (personSection || personImages > 0) {
      items.push({ num: 46, score: 1, detail: '人物に関するセクションはありますが、写真の掲載を目視確認してください' });
    } else {
      items.push({ num: 46, score: 0, detail: 'サービス提供者・スタッフの画像が見つかりません。写真掲載で安心感が向上します' });
    }
  }

  // 47. 店舗情報・運営会社
  {
    const companyKeywords = ['会社概要', '会社情報', '運営会社', '企業情報', '所在地', '住所', '設立', '資本金', '代表', 'アクセス', 'about', 'company'];
    const hasCompanyPage = $('a[href*="about"], a[href*="company"], a[href*="corporate"]').length > 0;
    const hasCompanyInfo = hasKeyword(bodyText.toLowerCase(), companyKeywords.map(k => k.toLowerCase()));

    if (hasCompanyInfo && hasCompanyPage) {
      items.push({ num: 47, score: 2, detail: '会社情報/店舗情報の記載とリンクを検出' });
    } else if (hasCompanyInfo || hasCompanyPage) {
      items.push({ num: 47, score: 1, detail: '会社情報はありますが、詳細ページのリンクも設置しましょう' });
    } else {
      items.push({ num: 47, score: 0, detail: '運営会社・店舗情報が見つかりません' });
    }
  }

  // 48. プライバシーポリシー・特商法
  {
    const hasPrivacy = $('a[href*="privacy"], a[href*="policy"]').length > 0 || bodyText.includes('プライバシーポリシー') || bodyText.includes('個人情報保護');
    const hasTokusho = $('a[href*="tokusho"], a[href*="law"], a[href*="legal"]').length > 0 || bodyText.includes('特定商取引') || bodyText.includes('特商法');

    if (hasPrivacy && hasTokusho) {
      items.push({ num: 48, score: 2, detail: 'プライバシーポリシー・特商法表示を検出' });
    } else if (hasPrivacy) {
      items.push({ num: 48, score: 1, detail: 'プライバシーポリシーはありますが、特定商取引法の表示も確認してください' });
    } else if (hasTokusho) {
      items.push({ num: 48, score: 1, detail: '特商法表示はありますが、プライバシーポリシーの設置も必要です' });
    } else {
      items.push({ num: 48, score: 0, detail: 'プライバシーポリシー・特商法表示が見つかりません' });
    }
  }

  // ===================
  // フォーム（49-50）
  // ===================

  // 49. フォーム項目数
  {
    const forms = $('form');
    if (forms.length === 0) {
      // フォームページへのリンクがあるかチェック
      const formLink = $('a[href*="contact"], a[href*="form"], a[href*="inquiry"]').length > 0;
      if (formLink) {
        items.push({ num: 49, score: null, detail: 'フォームは別ページにあるようです。項目数はそのページで確認してください' });
      } else {
        items.push({ num: 49, score: 0, detail: 'フォームが見つかりません' });
      }
    } else {
      const inputs = forms.find('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select');
      const required = forms.find('[required], .required').length;
      const count = inputs.length;

      if (count <= 5) {
        items.push({ num: 49, score: 2, detail: `フォーム項目数: ${count}個（必須: ${required}個）- 適切な項目数です` });
      } else if (count <= 8) {
        items.push({ num: 49, score: 1, detail: `フォーム項目数: ${count}個（必須: ${required}個）- やや多めです。必須項目を減らすと離脱防止になります` });
      } else {
        items.push({ num: 49, score: 0, detail: `フォーム項目数: ${count}個（必須: ${required}個）- 多すぎます。5項目以内に絞りましょう` });
      }
    }
  }

  // 50. フォーム入力の工夫
  {
    const forms = $('form');
    if (forms.length === 0) {
      const formLink = $('a[href*="contact"], a[href*="form"], a[href*="inquiry"]').length > 0;
      if (formLink) {
        items.push({ num: 50, score: null, detail: 'フォームは別ページにあるようです。入力の工夫はそのページで確認してください' });
      } else {
        items.push({ num: 50, score: 0, detail: 'フォームが見つかりません' });
      }
    } else {
      let improvements = 0;
      if (forms.find('select, [type="radio"], [type="checkbox"]').length > 0) improvements++;
      if (forms.find('[placeholder]').length > 0) improvements++;
      if (forms.find('[autocomplete]').length > 0) improvements++;
      if (forms.find('[type="tel"], [type="email"], [type="number"]').length > 0) improvements++;

      if (improvements >= 3) {
        items.push({ num: 50, score: 2, detail: `入力補助: ${improvements}種類の工夫を検出（選択式、プレースホルダー等）` });
      } else if (improvements >= 1) {
        items.push({ num: 50, score: 1, detail: `入力補助: ${improvements}種類。選択式の活用、プレースホルダー、自動入力などをさらに追加しましょう` });
      } else {
        items.push({ num: 50, score: 0, detail: 'フォームに入力補助の工夫がありません。選択式やプレースホルダーを活用しましょう' });
      }
    }
  }

  return items;
}

module.exports = { analyze50 };
