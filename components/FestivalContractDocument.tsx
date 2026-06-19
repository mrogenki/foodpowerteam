import React, { forwardRef } from 'react';

export interface FestivalContractBrand {
  brandName: string;
  festivalLabel: string;
  planText: string;
}

export interface FestivalContractData {
  companyName: string;
  representative: string;
  taxId: string;
  companyAddress: string;
  projectContact: string;
  brands: FestivalContractBrand[];
  total: number;
  waiveListingFee: boolean;
}

/**
 * 活動合作協議書文件內容（單一真實來源）。
 * 報名表（FestivalApply）與後台明細（FestivalApplicationManager）共用，
 * 確保法律條文一致。forwardRef 供 html2pdf 產生 PDF 使用。
 */
const FestivalContractDocument = forwardRef<HTMLDivElement, { data: FestivalContractData }>(({ data }, ref) => {
  const { companyName, representative, taxId, companyAddress, projectContact, brands, total, waiveListingFee } = data;
  return (
    <div ref={ref} className="bg-white text-[13px] leading-relaxed text-gray-700 space-y-3 [&>*]:break-inside-avoid">
      <p className="text-center text-base font-bold text-gray-900">活動合作協議書</p>
      <p>立協議書人</p>
      <p>
        <strong>甲方：</strong>食在力量美食產業交流協會（以下簡稱甲方）<br />
        <strong>乙方：</strong>{companyName || '（公司登記名稱）'}（以下簡稱乙方）
      </p>
      <p>
        茲因甲、乙雙方為促進企業資源整合、共創雙贏利基，乙方願以旗下品牌加入甲方所舉辦之燒肉祭／火鍋祭活動（下稱本活動）。
        雙方同意秉持著誠信、互惠原則共同合作，特立以下之條款，以為共同遵守之依據：
      </p>
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <p className="font-bold mb-1">本次參加品牌與方案：</p>
        <ol className="list-decimal pl-5 space-y-0.5">
          {brands.map((b, i) => (
            <li key={i}>
              {b.brandName || `（品牌 ${i + 1}）`}　—　{b.festivalLabel}　—{b.planText}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-red-600 font-bold">預估費用合計：NT$ {total.toLocaleString()}（以協會專員確認金額為準）</p>
      </div>
      <p className="font-bold">一、甲方：</p>
      <p>(1) 甲方應為本活動之內容宣傳及行銷。</p>
      <p>(2) 甲方使用乙方之品牌不得有抵損乙方商譽之行為。</p>
      <p className="font-bold">二、乙方：</p>
      {waiveListingFee ? (
        <p>(1) 本次合作經甲、乙雙方協議，<strong className="text-red-600">免收品牌上架費（NT$ 0）</strong>。</p>
      ) : (
        <p>(1) 乙方同意就每一參加品牌支付品牌上架費（每品牌每場次計）。品牌上架費原價為每品牌新台幣 9,000 元，本次專案優惠價為每品牌新台幣 3,000 元。</p>
      )}
      <p>(2) 乙方同意提供下列資源供本活動使用，並作為本活動內容宣傳及行銷用：a) 品牌 Logo；b) 價值 20,000 元以上的優惠券。</p>
      <p>(3) 乙方同意之活動方案：a) 方案A：免費提供 2 位 IG 圖文創作；b) 方案B：方案A 升級成 3 位 IG reels（影音），需另給付新台幣 4,500 元（每品牌計）。各品牌實際選擇如上表。</p>
      <p>(4) 乙方應提供本活動所需宣傳之品牌 LOGO、負責人肖像或其他著作物供甲方使用與曝光，但甲方於贊助文宣曝光前應提供乙方確認文宣內容後始得發布。另，乙方應保證前開提供甲方之宣傳內容皆屬合法授權。</p>
      <p>(5) 乙方應配合本活動之活動政策規定，不得任意取消本次合作或擅自更改約定之活動方案。</p>
      <p>(6) 本活動乙方所提供之文宣（包括但不限於品牌 LOGO、負責人肖像或其他著作物），甲方除於本活動期間得使用外，於活動結束後亦得繼續使用，包括但不限於甲方之官方網站、FB、IG 等相關社群媒體、甲方簡報及其他媒體曝光。惟若文宣使用引發不良效應，乙方得隨時通知甲方修改或撤文；若無不良效應，乙方不得要求甲方修改或撤文。</p>
      <p className="font-bold">三、其他重要約定事項：</p>
      <p>1. 除經他方事先同意，甲、乙雙方皆不得以移轉、讓與或其他方式，使第三人取得本協議書權利義務之全部或一部分。</p>
      <p>2. 本活動合作內容雙方應負保密義務。</p>
      <p>3. 本活動所製作之所有文宣品及其他著作物之著作權皆屬甲方所有。</p>
      <p>4. 雙方同意本於誠信原則履行本協議書內容，如因本協議書涉訟時，雙方同意以臺灣臺北地方法院為第一審管轄法院。</p>
      <p>5. 本協議書於乙方線上點選同意後即生效力。</p>
      <div className="border-t border-gray-300 pt-3 mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="font-bold">甲方</p>
          <p>食在力量美食產業交流協會</p>
          <p>理事長：許淳凱</p>
          <p>地址：臺北市中正區羅斯福路3段126號3樓</p>
          <p>電話：0925-981577</p>
          <p>立案證號：1130022533</p>
        </div>
        <div>
          <p className="font-bold">乙方</p>
          <p>公司：{companyName || '—'}</p>
          <p>代表人：{representative || '—'}</p>
          <p>統一編號：{taxId || '—'}</p>
          <p>地址：{companyAddress || '—'}</p>
          <p>聯絡人：{projectContact || '—'}</p>
        </div>
      </div>
    </div>
  );
});

FestivalContractDocument.displayName = 'FestivalContractDocument';

export default FestivalContractDocument;
