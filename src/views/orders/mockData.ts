import dayjs from "dayjs";

export function generateMockOrders(): any[] {
  let seed = 20261122;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const products = [
    {
      name: "Wireless Bluetooth Earbuds",
      asin: "B0CK9Y5K3P",
      store: "TechStore Official",
      brand: "SoundMax",
      image: "",
    },
    {
      name: "USB-C Hub Adapter 7-in-1",
      asin: "B0BN2K8R1T",
      store: "DigitalGear Pro",
      brand: "HubMaster",
      image: "",
    },
    {
      name: "Smart Watch Fitness Tracker",
      asin: "B0D1M4N7QZ",
      store: "WearTech Shop",
      brand: "FitPro",
      image: "",
    },
    {
      name: "LED Desk Lamp with Clamp",
      asin: "B0C8J3L9KM",
      store: "HomeLight Official",
      brand: "BrightDesk",
      image: "",
    },
    {
      name: "Portable Power Bank 20000mAh",
      asin: "B0BTYL6NPR",
      store: "PowerUp Store",
      brand: "ChargeMax",
      image: "",
    },
    {
      name: "Mechanical Gaming Keyboard",
      asin: "B0CW7R2H4S",
      store: "GameZone Official",
      brand: "KeyMaster",
      image: "",
    },
    {
      name: "Silicone Phone Case iPhone 15",
      asin: "B0CLNX8G7F",
      store: "CaseCraft Shop",
      brand: "ProCase",
      image: "",
    },
    {
      name: "Yoga Mat Non-Slip 6mm",
      asin: "B0B9K4T2WP",
      store: "FitLife Store",
      brand: "ZenMat",
      image: "",
    },
    {
      name: "Stainless Steel Water Bottle",
      asin: "B0CJNT5LQ8",
      store: "EcoBottle Official",
      brand: "AquaFresh",
      image: "",
    },
    {
      name: "Car Phone Holder Mount",
      asin: "B0CN8W3R6D",
      store: "AutoGear Pro",
      brand: "GripMount",
      image: "",
    },
    {
      name: "Mini Projector 1080P",
      asin: "B0D2K7N5JR",
      store: "CinemaHome Shop",
      brand: "ViewMax",
      image: "",
    },
    {
      name: "Electric Toothbrush Sonic",
      asin: "B0CL9M2T8K",
      store: "OralCare Official",
      brand: "SonicBright",
      image: "",
    },
  ];
  const countriesList = ["美国", "德国", "英国", "加拿大"];
  const statusList = ["待分配", "进行中", "已完成", "已截单", "暂停中"];
  const reviewTypes = ["真人测评", "自然测评", "催评", "Vine"];
  const orderTypes = ["免评", "文字评", "图片评", "视频评", "Feedback"];
  const salesPersons = ["张伟", "李婷", "王强", "刘芳", "陈明"];
  const customerNames = [
    "深圳星海科技",
    "广州优品贸易",
    "杭州云商电子",
    "上海锐迪数码",
    "北京天创科技",
  ];
  const groupNames = [
    "星海VIP群",
    "优品商务群",
    "云商对接群",
    "锐迪合作群",
    "天创服务群",
  ];
  const billingStatuses = ["已完成", "已完成", "已完成", "未完成"];
  const debtStatuses = ["none", "none", "none", "owed", "surplus", "cleared"];
  const feedbackChannels = ["私聊", "群组", "私聊", "群组", "私聊", "私聊"];
  const rows: any[] = [];

  for (let i = 0; i < 36; i++) {
    const p = products[i % products.length];
    const orderQty = Math.floor(random() * 20) + 3;
    const orderedCount = Math.floor(random() * orderQty);
    const reviewCount = Math.floor(random() * orderedCount);
    const cancelCount = random() > 0.7 ? Math.floor(random() * 3) : 0;
    const refundCount = random() > 0.8 ? Math.floor(random() * 2) : 0;
    const productPrice = (random() * 40 + 10).toFixed(2);
    const exchangeRate = (7.15 + random() * 0.2).toFixed(2);
    const commissionFee = Math.floor(random() * 50 + 20);
    const totalAmount = (
      Number(productPrice) * Number(exchangeRate) * orderQty +
      commissionFee * orderQty
    ).toFixed(2);
    const debtStatus =
      debtStatuses[Math.floor(random() * debtStatuses.length)];
    const debtAmount =
      debtStatus === "owed"
        ? Math.floor(random() * 500 + 100)
        : debtStatus === "surplus"
          ? Math.floor(random() * 200 + 50)
          : 0;
    const receivedCny = Number(totalAmount) * (0.5 + random() * 0.5);

    const hasMulti = random() > 0.7;
    const chosenTypes = hasMulti
      ? orderTypes.slice(0, Math.floor(random() * 3) + 2)
      : [orderTypes[Math.floor(random() * orderTypes.length)]];
    const typeQuantities: Record<string, number> = {};
    if (hasMulti) {
      let remaining = orderQty;
      chosenTypes.forEach((t, idx) => {
        if (idx === chosenTypes.length - 1) {
          typeQuantities[t] = remaining;
        } else {
          const qty = Math.floor(remaining / (chosenTypes.length - idx));
          typeQuantities[t] = qty;
          remaining -= qty;
        }
      });
    }

    const batchIdx = Math.floor(i / 3);
    const batchNumber = i < 12 ? `李婷 ${3 + batchIdx}月批次` : null;
    const custIdx = Math.floor(random() * customerNames.length);
    const fbChannel =
      feedbackChannels[Math.floor(random() * feedbackChannels.length)];

    rows.push({
      id: `order-${i + 1}`,
      order_number: `RM-2026-${String(1000 + i).padStart(4, "0")}`,
      batch_number: batchNumber,
      batch_id: batchNumber ? `batch-${batchIdx}` : null,
      product_name: p.name,
      product_image: p.image,
      asin: p.asin,
      store_name: p.store,
      brand_name: p.brand,
      country: countriesList[Math.floor(random() * countriesList.length)],
      status: statusList[Math.floor(random() * statusList.length)],
      review_type: reviewTypes[Math.floor(random() * reviewTypes.length)],
      order_type: chosenTypes[0],
      order_types: chosenTypes,
      type_quantities: hasMulti ? typeQuantities : undefined,
      order_quantity: orderQty,
      chat_order_id:
        random() > 0.5
          ? `CHAT-${Math.floor(random() * 9000 + 1000)}`
          : null,
      product_price: productPrice,
      exchange_rate: exchangeRate,
      commission_fee: commissionFee,
      total_amount: totalAmount,
      sales_person:
        salesPersons[Math.floor(random() * salesPersons.length)],
      customer_name: customerNames[custIdx],
      group_name: fbChannel === "群组" ? groupNames[custIdx] : null,
      feedback_channel: fbChannel,
      billing_status:
        billingStatuses[Math.floor(random() * billingStatuses.length)],
      debt_status: debtStatus,
      debt_amount: debtAmount,
      debt_notes:
        debtStatus !== "none" && debtStatus !== "cleared" ? "税费差价调整" : "",
      debt_marked_by: debtStatus === "owed" ? "张伟" : "",
      debt_marked_at: debtStatus === "owed" ? "2026-03-28T10:30:00" : null,
      order_feedback_status: random() > 0.5 ? "已反馈" : "未反馈",
      order_feedback_date: random() > 0.5 ? "2026-03-25" : null,
      review_feedback_status: random() > 0.6 ? "已反馈" : "未反馈",
      review_feedback_date: random() > 0.6 ? "2026-03-27" : null,
      feedback_notes: random() > 0.7 ? "客户已确认全部订单到货" : "",
      notes: random() > 0.6 ? "需要加急处理" : "",
      created_at: dayjs()
        .subtract(Math.floor(random() * 30), "day")
        .format("YYYY-MM-DD HH:mm:ss"),
      _ordered_count: orderedCount,
      _review_count: reviewCount,
      _cancel_count: cancelCount,
      _refund_count: refundCount,
      _refund_total:
        refundCount > 0 ? (random() * 100 + 20).toFixed(2) : 0,
      _refund_method_summary: refundCount > 0 ? "原路退回" : "",
      _refund_date_summary: refundCount > 0 ? "2026-03-20" : "",
      _payment_total_cny: Number(receivedCny.toFixed(2)),
      _payment_total_usd: Number(
        (receivedCny / Number(exchangeRate)).toFixed(2),
      ),
    });
  }
  return rows;
}

export function generateMockPayments(orderId: string): any[] {
  return [
    {
      id: `pay-${orderId}-1`,
      batch_id: orderId,
      amount_cny: 3500,
      payment_date: "2026-03-15",
      payment_method: "银行转账",
      payer_name: "深圳星海科技",
      payment_type: "基础收款",
      notes: "首期款项",
      payment_group_id: null,
      group_orders: null,
    },
    {
      id: `pay-${orderId}-2`,
      batch_id: orderId,
      amount_cny: 800,
      payment_date: "2026-03-22",
      payment_method: "微信",
      payer_name: "深圳星海科技",
      payment_type: "补款",
      notes: "",
      payment_group_id: `pg-${orderId}`,
      group_orders: [
        {
          order_id: orderId,
          asin: "B0CK9Y5K3P",
          order_number: "RM-2026-1000",
          allocated_amount: 500,
        },
        {
          order_id: "order-other",
          asin: "B0BN2K8R1T",
          order_number: "RM-2026-1001",
          allocated_amount: 300,
        },
      ],
    },
  ];
}

export const MOCK_MANAGER_WECHAT: Record<string, string[]> = {
  张伟: ["zh_wei_work", "张伟客服号"],
  李婷: ["liting_biz"],
  王强: ["wq_commerce", "王强-商务"],
  刘芳: ["liufang_work"],
  陈明: ["chenming_01"],
};
